import { ClientError, ServerError } from '@trend-diary/common/errors'
import { err, ok, type Result } from 'neverthrow'
import type { Command, Notifier, Query } from './repository'
import type { CurrentUser } from './schema/active-user-schema'

export class AccountUseCase {
  constructor(
    private readonly userCommand: Command,
    private readonly userQuery: Query,
  ) {}

  /**
   * 認証ユーザー(authenticationId)に紐づくアクティブユーザーを作成する。
   * NOTE: 呼び出し側で認証ユーザーは作成済みのため、ここで失敗すると認証側に孤児ユーザーが残る。
   * 同期補償(認証ユーザーの削除)はSupabaseの管理者権限(service_role)を要するが、サインアップ経路
   * (anonクライアント)にadmin権限を持たせるべきではないため同期補償は行わない。対応候補は、
   * service_roleを持つ別cronでactive_user未紐付けの認証ユーザーを定期クリーンアップするなど。別イシューで再設計する。
   */
  async registerActiveUser(
    email: string,
    authenticationId: string,
    notifier: Notifier,
    displayName?: string | null,
  ): Promise<Result<CurrentUser, ServerError>> {
    return this.userCommand.createActiveWithAuthenticationId(
      email,
      authenticationId,
      notifier,
      displayName,
    )
  }

  /**
   * 認証済みの authenticationId からアクティブユーザーを解決する。
   */
  async resolveActiveUser(
    authenticationId: string,
  ): Promise<Result<CurrentUser, ClientError | ServerError>> {
    const activeUserResult = await this.userQuery.findActiveByAuthenticationId(authenticationId)

    if (activeUserResult.isErr()) {
      return err(new ServerError(activeUserResult.error))
    }

    if (!activeUserResult.value) {
      return err(new ClientError('User not found', 404))
    }

    return ok(activeUserResult.value)
  }
}
