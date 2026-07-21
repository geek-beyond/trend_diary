import { err, ok, type Result } from 'neverthrow'
import { type AccountRepositoryError, ActiveUserNotFoundError } from './error'
import type { Command, Notifier, Query } from './port'
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
  ): Promise<Result<CurrentUser, AccountRepositoryError>> {
    return this.userCommand.createActiveWithAuthenticationId(
      email,
      authenticationId,
      notifier,
      displayName,
    )
  }

  async resolveActiveUser(
    authenticationId: string,
  ): Promise<Result<CurrentUser, ActiveUserNotFoundError | AccountRepositoryError>> {
    const activeUserResult = await this.userQuery.findActiveByAuthenticationId(authenticationId)

    if (activeUserResult.isErr()) {
      return err(activeUserResult.error)
    }

    if (!activeUserResult.value) {
      return err(new ActiveUserNotFoundError('User not found'))
    }

    return ok(activeUserResult.value)
  }
}
