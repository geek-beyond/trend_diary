import type { ActiveUser as RdbActiveUser } from '@/infrastructure/drizzle-orm/schema'
import { fromDbId } from '@/infrastructure/rdb-id'
import type { CurrentUser } from '../schema/active-user-schema'

export function mapToActiveUser(activeUser: RdbActiveUser): CurrentUser {
  return {
    activeUserId: fromDbId(activeUser.activeUserId),
    userId: fromDbId(activeUser.userId),
    email: activeUser.email,
    displayName: activeUser.displayName,
    authenticationId: activeUser.authenticationId ?? undefined,
    createdAt: activeUser.createdAt,
    updatedAt: activeUser.updatedAt,
  }
}
