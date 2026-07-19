import { ClientError, ServerError } from '@trend-diary/common/errors'
import { err, ok, type Result } from 'neverthrow'
import type { Command, Notifier, Query } from './repository'
import type { CurrentUser } from './schema/active-user-schema'

export class AccountUseCase {
  constructor(
    private readonly userCommand: Command,
    private readonly userQuery: Query,
  ) {}

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

  async resolveOrRegisterActiveUser(
    authenticationId: string,
    email: string,
    notifier: Notifier,
  ): Promise<Result<CurrentUser, ServerError>> {
    const activeUserResult = await this.userQuery.findActiveByAuthenticationId(authenticationId)

    if (activeUserResult.isErr()) {
      return err(new ServerError(activeUserResult.error))
    }

    if (activeUserResult.value) {
      return ok(activeUserResult.value)
    }

    // アプリ側ユーザーが未作成の初回GitHubログインは、ここで作成して新規登録として扱う
    return this.userCommand.createActiveWithAuthenticationId(email, authenticationId, notifier)
  }
}
