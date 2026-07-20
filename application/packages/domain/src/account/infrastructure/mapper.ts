import { fromDbId } from '@trend-diary/datastore/rdb/id'
import type { ActiveUser as RdbActiveUser } from '@trend-diary/datastore/schema'
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
