import {
  AuthAdminClient,
  type AuthClientConfig,
  PasswordAuthClient,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { fromDbId, toDbIds } from '@trend-diary/datastore/rdb/id'
import { activeUsers, users } from '@trend-diary/datastore/schema'
import type { ActiveUser } from '@trend-diary/domain/account'
import { eq, inArray, like } from 'drizzle-orm'
import app from '@/server'
import TEST_ENV from '@/test/env'
import { testRdb as db } from './rdb'

// フィクスチャ用途では Cookie を使わないため素通しにする
const authConfig: AuthClientConfig = {
  url: TEST_ENV.SUPABASE_URL,
  anonKey: TEST_ENV.SUPABASE_ANON_KEY,
  cookieHeader: '',
  setCookie: () => undefined,
}

let passwordAuth: PasswordAuthClient | null = null
let authAdmin: AuthAdminClient | null = null

function getPasswordAuth(): PasswordAuthClient {
  if (!passwordAuth) {
    passwordAuth = new PasswordAuthClient(authConfig)
  }
  return passwordAuth
}

function getAuthAdmin(): AuthAdminClient | null {
  if (!TEST_ENV.SUPABASE_SERVICE_ROLE_KEY) return null
  if (!authAdmin) {
    authAdmin = new AuthAdminClient({
      url: TEST_ENV.SUPABASE_URL,
      serviceRoleKey: TEST_ENV.SUPABASE_SERVICE_ROLE_KEY,
    })
  }
  return authAdmin
}

async function deleteAuthUsersByEmailPattern(emailPattern: string): Promise<void> {
  const admin = getAuthAdmin()
  if (!admin) return

  const matchedIds = (await admin.listUsers())
    .filter((user) => (user.email ?? '').includes(emailPattern))
    .map((user) => user.id)

  await Promise.all(matchedIds.map((id) => admin.deleteUser(id)))
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
  const auth = getPasswordAuth()

  const signUpResult = await auth.signUp({ email, password })

  let authenticationId: string
  if (signUpResult.isErr()) {
    // 既に登録済みならサインインして認証IDを引く。それ以外は想定外の失敗
    if (!(signUpResult.error instanceof UserAlreadyExistsError)) {
      throw new Error(`Failed to create user: ${signUpResult.error.message}`)
    }

    const signInResult = await auth.signIn({ email, password })
    if (signInResult.isErr()) {
      throw new Error(`Failed to create user: ${signInResult.error.message}`)
    }
    authenticationId = signInResult.value.id
  } else {
    authenticationId = signUpResult.value.id
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
  await auth.signOut()

  return {
    activeUserId: activeUser.activeUserId,
    userId: activeUser.userId,
    authenticationId,
  }
}

export async function createWithGithub(email: string, password: string): Promise<CreateResult> {
  const res = await fetch(`${TEST_ENV.SUPABASE_URL}/__emulator/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, identities: [{ provider: 'github' }] }),
  })
  if (res.status !== 201) {
    throw new Error(`Failed to seed github user: ${res.status} ${await res.text()}`)
  }

  // oxlint-disable-next-line typescript/consistent-type-assertions -- emulatorのseed応答から必要なidのみ取り出すため
  const { id: authenticationId } = (await res.json()) as { id: string }
  const activeUser = await createActiveUser(email, authenticationId)

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
    '/api/sessions',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {
        'Content-Type': 'application/json',
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
  await getPasswordAuth().signOut()
}

export async function cleanUp(ids: CleanUpIds): Promise<void> {
  // ログアウト
  await getPasswordAuth().signOut()

  // DBのユーザーをバッチ削除
  if (ids.userIds.length > 0) {
    const dbUserIds = toDbIds(ids.userIds)
    await db.delete(activeUsers).where(inArray(activeUsers.userId, dbUserIds))
    await db.delete(users).where(inArray(users.userId, dbUserIds))
  }

  // 認証ユーザーをバッチ削除
  if (ids.authIds.length > 0) {
    const admin = getAuthAdmin()
    if (admin) {
      await Promise.all(ids.authIds.map((id) => admin.deleteUser(id)))
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

    // 認証ユーザーも削除
    if (authIds.length > 0) {
      const admin = getAuthAdmin()
      if (admin) {
        await Promise.all(authIds.map((id) => admin.deleteUser(id)))
      }
    }
  }

  // auth.users に直接存在するユーザーも削除（ActiveUserがない場合）
  await deleteAuthUsersByEmailPattern(emailPattern)
}
