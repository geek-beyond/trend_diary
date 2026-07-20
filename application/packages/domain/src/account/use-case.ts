import { ClientError, ServerError } from '@trend-diary/std/errors'
import { err, ok, type Result } from 'neverthrow'
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
}
