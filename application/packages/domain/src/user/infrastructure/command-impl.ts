import { ServerError } from '@trend-diary/common/errors'
import { activeUsers, users } from '@trend-diary/datastore/drizzle-orm/schema'
import { RdbClient, wrapDbCall } from '@trend-diary/datastore/rdb'
import { eq } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import { Command } from '../repository'
import type { CurrentUser } from '../schema/active-user-schema'
import { mapToActiveUser } from './mapper'

export default class CommandImpl implements Command {
  constructor(private readonly db: RdbClient) {}

  async createActiveWithAuthenticationId(
    email: string,
    authenticationId: string,
    displayName?: string | null,
  ): Promise<Result<CurrentUser, ServerError>> {
    // INFO: D1はインタラクティブトランザクション非対応のため、users→active_usersを逐次insertし、
    //       2文目失敗時はusersをdeleteする補償方式で整合性を担保する
    const userResult = await wrapDbCall(() => this.db.insert(users).values({}).returning())
    if (userResult.isErr()) {
      return err(new ServerError('Failed to create active user'))
    }

    const createdUser = userResult.value[0]
    if (!createdUser) {
      return err(new ServerError('Failed to create active user'))
    }
    const { userId } = createdUser

    // INFO: active_users insert失敗時の補償。作成済みusersを削除しエラーを返す。
    //       補償自体の失敗は握りつぶし、元のエラーを優先して返す
    const compensateAndFail = async (): Promise<Result<CurrentUser, ServerError>> => {
      await wrapDbCall(() => this.db.delete(users).where(eq(users.userId, userId)))
      return err(new ServerError('Failed to create active user'))
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
