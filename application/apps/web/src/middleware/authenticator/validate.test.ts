import Logger from '@trend-diary/common/logger'
import { activeUsers, users } from '@trend-diary/datastore/drizzle-orm/schema'
import { fromDbId, toDbIds } from '@trend-diary/datastore/rdb/id'
import { inArray } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Result } from 'neverthrow'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import { testRdb } from '@/test/helper/rdb'
import { platformEnv } from '@/test/setup/platform-proxy'
import CONTEXT_KEY from '../context'
import { validateSession } from './validate'

// Supabase は認証プロバイダという外部境界のため、getClaims だけを差し替える
// (アカウント解決は実 D1 + 実ドメインで検証し、ドメインはモックしない)
vi.mock('@/infrastructure/supabase', () => ({ createSupabaseAuthClient: vi.fn() }))

// getClaimsは署名検証結果を返す。テストごとに任意のclaims/エラーを注入する
// oxlint-disable-next-line typescript/no-restricted-types -- テストごとに任意の戻り値を返すスタブを差し替えるため
function mockGetClaims(impl: () => Promise<unknown>) {
  vi.mocked(createSupabaseAuthClient).mockReturnValue(
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- テストで必要な auth.getClaims のみを差し替えるための境界キャストのため
    { auth: { getClaims: impl } } as unknown as ReturnType<typeof createSupabaseAuthClient>,
  )
}

function buildContext(): Context<Env> {
  // ログは silent で実ロガーを使い、出力の詳細ではなく返り値(Result)を検証する
  const logger = new Logger('silent')
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  const c = {
    get: (key: string) => (key === CONTEXT_KEY.APP_LOG ? logger : undefined),
    env: { DB: platformEnv.DB },
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as Context<Env>
  return c
}

// 想定と異なる分岐に落ちたら即座に失敗させ、取り違えを検知する
function unwrapOk<T, E>(result: Result<T, E>): T {
  if (result.isErr()) throw result.error
  return result.value
}

function unwrapErr<T, E>(result: Result<T, E>): E {
  if (result.isOk()) throw new Error('Result が Ok でした')
  return result.error
}

// 実 D1 に active user を直接投入し、実ドメインの resolveActiveUser で解決させる
async function seedActiveUser(
  authenticationId: string,
  email: string,
  displayName: string | null,
): Promise<{ activeUserId: bigint; userId: bigint }> {
  const [user] = await testRdb.insert(users).values({}).returning()
  const [activeUser] = await testRdb
    .insert(activeUsers)
    .values({ userId: user.userId, email, displayName, authenticationId, updatedAt: new Date() })
    .returning()
  return { activeUserId: fromDbId(activeUser.activeUserId), userId: fromDbId(user.userId) }
}

describe('validateSession', () => {
  const createdUserIds: bigint[] = []

  afterEach(async () => {
    if (createdUserIds.length > 0) {
      const dbUserIds = toDbIds(createdUserIds)
      await testRdb.delete(activeUsers).where(inArray(activeUsers.userId, dbUserIds))
      await testRdb.delete(users).where(inArray(users.userId, dbUserIds))
      createdUserIds.length = 0
    }
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('セッションが有効な場合はアクティブユーザーを認可に必要な3項目へ絞り込んで返すこと', async () => {
      const authenticationId = crypto.randomUUID()
      const seeded = await seedActiveUser(authenticationId, 'active@example.com', 'テスト太郎')
      createdUserIds.push(seeded.userId)
      mockGetClaims(() =>
        Promise.resolve({ data: { claims: { sub: authenticationId } }, error: null }),
      )

      const result = await validateSession(buildContext())

      // resolveActiveUser は authenticationId 等の内部項目も返すが、SESSION_USER には漏らさない
      expect(unwrapOk(result).sessionUser).toEqual({
        activeUserId: seeded.activeUserId,
        displayName: 'テスト太郎',
        email: 'active@example.com',
      })
    })
  })

  describe('準正常系', () => {
    it('セッションが検証できない場合は reason=no_session を返すこと', async () => {
      mockGetClaims(() => Promise.resolve({ data: null, error: { message: 'invalid session' } }))

      const result = await validateSession(buildContext())

      expect(unwrapErr(result).reason).toBe('no_session')
    })

    it('検証済みだが対応するアクティブユーザーが存在しない場合は reason=validation_failed を返すこと', async () => {
      // 実 D1 に投入していない認証IDのため、resolveActiveUser が未検出(ClientError)を返す
      mockGetClaims(() =>
        Promise.resolve({ data: { claims: { sub: crypto.randomUUID() } }, error: null }),
      )

      const result = await validateSession(buildContext())

      expect(unwrapErr(result).reason).toBe('validation_failed')
    })
  })
})
