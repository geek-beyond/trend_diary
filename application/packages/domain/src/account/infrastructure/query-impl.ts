import type { RdbClient } from '@trend-diary/datastore/rdb'
import { wrapDbCall } from '@trend-diary/datastore/rdb'
import { toDbId } from '@trend-diary/datastore/rdb/id'
import { activeUsers } from '@trend-diary/datastore/schema'
import type { Nullable } from '@trend-diary/std/types/utility'
import { eq } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import { type AccountError, AccountRepositoryError } from '../error'
import type { Query } from '../port'
import type { CurrentUser } from '../schema/active-user-schema'
import { mapToActiveUser } from './mapper'

export default class QueryImpl implements Query {
  constructor(private readonly db: RdbClient) {}

  async findActiveById(id: bigint): Promise<Result<Nullable<CurrentUser>, AccountError>> {
    const dbId = toDbId(id)
    const activeUserResult = await wrapDbCall(() =>
      this.db.select().from(activeUsers).where(eq(activeUsers.activeUserId, dbId)).limit(1),
    )
    if (activeUserResult.isErr()) {
      return err(new AccountRepositoryError(activeUserResult.error))
    }

    const activeUser = activeUserResult.value[0]
    if (!activeUser) {
      return ok(null)
    }

    return ok(mapToActiveUser(activeUser))
  }

  async findActiveByEmail(email: string): Promise<Result<Nullable<CurrentUser>, AccountError>> {
    const activeUserResult = await wrapDbCall(() =>
      this.db.select().from(activeUsers).where(eq(activeUsers.email, email)).limit(1),
    )
    if (activeUserResult.isErr()) {
      return err(new AccountRepositoryError(activeUserResult.error))
    }

    const activeUser = activeUserResult.value[0]
    if (!activeUser) {
      return ok(null)
    }

    return ok(mapToActiveUser(activeUser))
  }

  async findActiveByAuthenticationId(
    authenticationId: string,
  ): Promise<Result<Nullable<CurrentUser>, AccountError>> {
    const activeUserResult = await wrapDbCall(() =>
      this.db
        .select()
        .from(activeUsers)
        .where(eq(activeUsers.authenticationId, authenticationId))
        .limit(1),
    )
    if (activeUserResult.isErr()) {
      return err(new AccountRepositoryError(activeUserResult.error))
    }

    const activeUser = activeUserResult.value[0]
    if (!activeUser) {
      return ok(null)
    }

    return ok(mapToActiveUser(activeUser))
  }
}
