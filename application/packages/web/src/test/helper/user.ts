import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { activeUsers, users } from '@trend-diary/datastore/drizzle-orm/schema'
import { fromDbId, toDbIds } from '@trend-diary/datastore/rdb/id'
import type { ActiveUser } from '@trend-diary/domain/user'
import { eq, inArray, like } from 'drizzle-orm'
import app from '@/server'
import TEST_ENV from '@/test/env'
import { testRdb as db } from './rdb'

// Supabaseクライアント
let supabase: SupabaseClient | null = null
let supabaseAdmin: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(TEST_ENV.SUPABASE_URL, TEST_ENV.SUPABASE_ANON_KEY)
  }
  return supabase
}

function getSupabaseAdmin(): SupabaseClient | null {
  if (!TEST_ENV.SUPABASE_SERVICE_ROLE_KEY) return null
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(TEST_ENV.SUPABASE_URL, TEST_ENV.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return supabaseAdmin
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

async function createActiveUser(email: string, authenticationId: string): Promise<ActiveUser> {
  const [user] = await db.insert(users).values({}).returning()

  const [activeUser] = await db
    .insert(activeUsers)
    .values({
      userId: user.userId,
      email,
      displayName: null,
      authenticationId,
      updatedAt: new Date(),
    })
    .returning()

  return {
    activeUserId: fromDbId(activeUser.activeUserId),
    userId: fromDbId(user.userId),
    email: activeUser.email,
    displayName: activeUser.displayName,
    authenticationId: activeUser.authenticationId,
    createdAt: activeUser.createdAt,
    updatedAt: activeUser.updatedAt,
  }
}

export interface CreateResult {
  activeUserId: bigint
  userId: bigint
  authenticationId: string
}

export interface LoginResult {
  activeUserId: bigint
  cookies: string
}

export interface CleanUpIds {
  userIds: bigint[]
  authIds: string[]
}

export async function create(email: string, password: string): Promise<CreateResult> {
  const client = getSupabase()

  const signUpResult = await client.auth.signUp({ email, password })

  let authenticationId: string
  if (signUpResult.error) {
    if (!signUpResult.error.message.includes('User already registered')) {
      throw new Error(`Failed to create user: ${signUpResult.error.message}`)
    }

    const signInResult = await client.auth.signInWithPassword({ email, password })
    if (signInResult.error || !signInResult.data.user) {
      throw new Error(`Failed to create user: ${signInResult.error?.message ?? 'Unknown error'}`)
    }
    authenticationId = signInResult.data.user.id
  } else if (signUpResult.data.user) {
    authenticationId = signUpResult.data.user.id
  } else {
    throw new Error('Failed to create user: Unknown error')
  }

  const [existingActiveUser] = await db
    .select({ activeUserId: activeUsers.activeUserId, userId: activeUsers.userId })
    .from(activeUsers)
    .where(eq(activeUsers.authenticationId, authenticationId))
    .limit(1)

  const activeUser = existingActiveUser
    ? {
        activeUserId: fromDbId(existingActiveUser.activeUserId),
        userId: fromDbId(existingActiveUser.userId),
      }
    : await createActiveUser(email, authenticationId)

  // signUp後はログアウトして初期状態にする
  await client.auth.signOut()

  return {
    activeUserId: activeUser.activeUserId,
    userId: activeUser.userId,
    authenticationId,
  }
}

// Set-Cookie ヘッダーも返すので後続リクエストに使用できる。
export async function login(email: string, password: string): Promise<LoginResult> {
  // Hono経由でログイン
  const res = await app.request(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {
        'Content-Type': 'application/json',
        'Sec-Fetch-Site': 'same-origin',
      },
    },
    TEST_ENV,
  )

  if (res.status !== 200) {
    throw new Error(`Failed to login: ${res.status}`)
  }

  // Set-Cookieヘッダーを取得
  const setCookieHeaders = res.headers.getSetCookie()
  const cookies = setCookieHeaders.map((cookie) => cookie.split(';')[0]).join('; ')

  // DBからActiveUserを取得
  const [activeUser] = await db
    .select()
    .from(activeUsers)
    .where(eq(activeUsers.email, email))
    .limit(1)

  if (!activeUser) {
    throw new Error(`ActiveUser not found for email: ${email}`)
  }

  return {
    activeUserId: fromDbId(activeUser.activeUserId),
    cookies,
  }
}

export async function logout(): Promise<void> {
  const client = getSupabase()
  await client.auth.signOut()
}

export async function cleanUp(ids: CleanUpIds): Promise<void> {
  // ログアウト
  const client = getSupabase()
  await client.auth.signOut()

  // DBのユーザーをバッチ削除
  if (ids.userIds.length > 0) {
    const dbUserIds = toDbIds(ids.userIds)
    await db.delete(activeUsers).where(inArray(activeUsers.userId, dbUserIds))
    await db.delete(users).where(inArray(users.userId, dbUserIds))
  }

  // Supabase Authのユーザーをバッチ削除
  if (ids.authIds.length > 0) {
    const admin = getSupabaseAdmin()
    if (admin) {
      await Promise.all(ids.authIds.map((id) => admin.auth.admin.deleteUser(id)))
    }
  }
}

// signup API などで直接作成されたユーザー(ActiveUser なし)もクリーンアップする。
export async function cleanUpByEmailPattern(emailPattern: string): Promise<void> {
  // DBのユーザーを削除
  const activeUserRows = await db
    .select({ userId: activeUsers.userId, authenticationId: activeUsers.authenticationId })
    .from(activeUsers)
    .where(like(activeUsers.email, `%${emailPattern}%`))

  if (activeUserRows.length > 0) {
    const userIds = activeUserRows.map((u) => u.userId)
    const authIds = activeUserRows.map((u) => u.authenticationId).filter((id): id is string => !!id)

    await db.delete(activeUsers).where(inArray(activeUsers.userId, userIds))
    await db.delete(users).where(inArray(users.userId, userIds))

    // Supabase Authのユーザーも削除
    if (authIds.length > 0) {
      const admin = getSupabaseAdmin()
      if (admin) {
        await Promise.all(authIds.map((id) => admin.auth.admin.deleteUser(id)))
      }
    }
  }

  // auth.users に直接存在するユーザーも削除（ActiveUserがない場合）
  await deleteAuthUsersByEmailPattern(emailPattern)
}
