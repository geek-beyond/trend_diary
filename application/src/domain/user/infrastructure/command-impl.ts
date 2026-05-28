import { ServerError } from '@/common/errors'
import { AsyncResult, failure, isFailure, success, wrapAsyncCall } from '@/common/result'
import { RdbClient } from '@/infrastructure/rdb'
import { Command } from '../repository'
import type { CurrentUser } from '../schema/active-user-schema'
import { mapToActiveUser } from './mapper'

export default class CommandImpl implements Command {
  constructor(private readonly db: RdbClient) {}

  async createActiveWithAuthenticationId(
    email: string,
    authenticationId: string,
    displayName?: string | null,
  ): AsyncResult<CurrentUser, ServerError> {
    const activeUserResult = await wrapAsyncCall(() =>
      this.db.activeUser.create({
        data: {
          email,
          authenticationId,
          displayName,
          user: {
            create: {},
          },
        },
      }),
    )

    if (isFailure(activeUserResult)) {
      return failure(new ServerError('Failed to create active user'))
    }

    return success(mapToActiveUser(activeUserResult.value))
  }
}
