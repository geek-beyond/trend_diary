import type { RdbClient } from '@trend-diary/datastore/rdb'
import { wrapDbCall } from '@trend-diary/datastore/rdb'
import { activeUsers, users } from '@trend-diary/datastore/schema'
import Logger from '@trend-diary/logger'
import { eq } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import { type AccountError, AccountRepositoryError } from '../error'
import type { Command, Notifier } from '../port'
import type { CurrentUser } from '../schema/active-user-schema'
import { mapToActiveUser } from './mapper'

// 補償失敗は手動対応が必要なため、デフォルトのログレベルをerrorに設定する
const defaultLogger = new Logger('error', { component: 'user-command' })

export default class CommandImpl implements Command {
  constructor(
    private readonly db: RdbClient,
    private readonly logger: Logger = defaultLogger,
  ) {}

  async createActiveWithAuthenticationId(
    email: string,
    authenticationId: string,
    notifier: Notifier,
    displayName?: string | null,
  ): Promise<Result<CurrentUser, AccountError>> {
    // INFO: D1はインタラクティブトランザクション非対応のため、users→active_usersを逐次insertし、
    //       2文目失敗時はusersをdeleteする補償方式で整合性を担保する
    const userResult = await wrapDbCall(() => this.db.insert(users).values({}).returning())
    if (userResult.isErr()) {
      return err(new AccountRepositoryError('Failed to create active user'))
    }

    const createdUser = userResult.value[0]
    if (!createdUser) {
      return err(new AccountRepositoryError('Failed to create active user'))
    }
    const { userId } = createdUser

    // INFO: active_users insert失敗時の補償。作成済みusersを削除しエラーを返す。
    //       補償自体の失敗は元のエラーを優先して返すが、active_usersを持たないusersレコードが
    //       孤立して残り自動検知できないため、手動対応に必要なuserIdと補償エラーをerrorログに残す
    const compensateAndFail = async (): Promise<Result<CurrentUser, AccountError>> => {
      const compensateResult = await wrapDbCall(() =>
        this.db.delete(users).where(eq(users.userId, userId)),
      )
      if (compensateResult.isErr()) {
        this.logger.error(
          { msg: 'signup compensation failed: orphaned user may remain', userId },
          compensateResult.error,
        )
        // 通知失敗は補償処理の結果に影響させない（通知基盤側で握りつぶす）
        await notifier.sendMessage(
          `🚨 整合性エラー: active_usersを持たないusersレコードが孤立（サインアップ補償トランザクション失敗）\nuserId: ${userId}\nerror: ${compensateResult.error.message}`,
        )
      }
      return err(new AccountRepositoryError('Failed to create active user'))
    }

    // INFO: PrismaのupdatedAt(@updatedAt)はDrizzleでは自動付与されないため明示的に現在時刻を設定する
    const now = new Date()
    const activeUserResult = await wrapDbCall(() =>
      this.db
        .insert(activeUsers)
        .values({
          email,
          authenticationId,
          displayName,
          updatedAt: now,
          userId,
        })
        .returning(),
    )
    if (activeUserResult.isErr()) {
      return compensateAndFail()
    }

    const activeUser = activeUserResult.value[0]
    if (!activeUser) {
      return compensateAndFail()
    }

    return ok(mapToActiveUser(activeUser))
  }
}
