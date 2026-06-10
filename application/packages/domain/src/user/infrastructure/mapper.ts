import type { ActiveUser as RdbActiveUser } from '@trend-diary/datastore/drizzle-orm/schema'
import { fromDbId } from '@trend-diary/datastore/rdb/id'
import type { CurrentUser } from '../schema/active-user-schema'

export function mapToActiveUser(activeUser: RdbActiveUser): CurrentUser {
  return {
    activeUserId: fromDbId(activeUser.activeUserId),
    userId: fromDbId(activeUser.userId),
    email: activeUser.email,
    displayName: activeUser.displayName,
    authenticationId: activeUser.authenticationId,
    createdAt: activeUser.createdAt,
    updatedAt: activeUser.updatedAt,
  }
}
