import { ServerError } from '@trend-diary/common/errors'
import { Nullable } from '@trend-diary/common/types/utility'
import { eq } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import { activeUsers } from '@/infrastructure/drizzle-orm/schema'
import { RdbClient, wrapDbCall } from '@/infrastructure/rdb'
import { toDbId } from '@/infrastructure/rdb/id'
import { Query } from '../repository'
import type { CurrentUser } from '../schema/active-user-schema'
import { mapToActiveUser } from './mapper'

export default class QueryImpl implements Query {
  constructor(private readonly db: RdbClient) {}

  async findActiveById(id: bigint): Promise<Result<Nullable<CurrentUser>, Error>> {
    const dbId = toDbId(id)
    const activeUserResult = await wrapDbCall(() =>
      this.db.select().from(activeUsers).where(eq(activeUsers.activeUserId, dbId)).limit(1),
    )
    if (activeUserResult.isErr()) {
      return err(new ServerError(activeUserResult.error))
    }

    const activeUser = activeUserResult.value[0]
    if (!activeUser) {
      return ok(null)
    }

    return ok(mapToActiveUser(activeUser))
  }

  async findActiveByEmail(email: string): Promise<Result<Nullable<CurrentUser>, Error>> {
    const activeUserResult = await wrapDbCall(() =>
      this.db.select().from(activeUsers).where(eq(activeUsers.email, email)).limit(1),
    )
    if (activeUserResult.isErr()) {
      return err(new ServerError(activeUserResult.error))
    }

    const activeUser = activeUserResult.value[0]
    if (!activeUser) {
      return ok(null)
    }

    return ok(mapToActiveUser(activeUser))
  }

  async findActiveByAuthenticationId(
    authenticationId: string,
  ): Promise<Result<Nullable<CurrentUser>, Error>> {
    const activeUserResult = await wrapDbCall(() =>
      this.db
        .select()
        .from(activeUsers)
        .where(eq(activeUsers.authenticationId, authenticationId))
        .limit(1),
    )
    if (activeUserResult.isErr()) {
      return err(new ServerError(activeUserResult.error))
    }

    const activeUser = activeUserResult.value[0]
    if (!activeUser) {
      return ok(null)
    }

    return ok(mapToActiveUser(activeUser))
  }
}
