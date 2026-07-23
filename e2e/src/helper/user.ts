import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { RdbClient } from '@trend-diary/datastore/rdb'
import { activeUsers, users } from '@trend-diary/datastore/schema'
import { inArray, like } from 'drizzle-orm'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_SERVICE_ROLE_KEY) return null
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function deleteAuthUsersByEmailPattern(emailPattern: string): Promise<void> {
  const admin = getSupabaseAdmin()
  if (!admin) return

  let page = 1
  const perPage = 200
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) break

    const matchedIds = data.users
      .filter((user) => (user.email ?? '').includes(emailPattern))
      .map((user) => user.id)
    await Promise.all(matchedIds.map((id) => admin.auth.admin.deleteUser(id)))

    if (data.users.length < perPage) break
    page += 1
  }
}

// signup API などで直接作成されたユーザー(ActiveUser なし)もクリーンアップする。
export async function cleanUpByEmailPattern(rdb: RdbClient, emailPattern: string): Promise<void> {
  const activeUserRows = await rdb
    .select({ userId: activeUsers.userId, authenticationId: activeUsers.authenticationId })
    .from(activeUsers)
    .where(like(activeUsers.email, `%${emailPattern}%`))

  if (activeUserRows.length > 0) {
    const userIds = activeUserRows.map((u) => u.userId)
    const authIds = activeUserRows.map((u) => u.authenticationId).filter((id): id is string => !!id)

    await rdb.delete(activeUsers).where(inArray(activeUsers.userId, userIds))
    await rdb.delete(users).where(inArray(users.userId, userIds))

    if (authIds.length > 0) {
      const admin = getSupabaseAdmin()
      if (admin) {
        await Promise.all(authIds.map((id) => admin.auth.admin.deleteUser(id)))
      }
    }
  }

  await deleteAuthUsersByEmailPattern(emailPattern)
}
