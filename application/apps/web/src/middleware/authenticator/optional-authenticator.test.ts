import type { Context, Next } from 'hono'
import { err, ok } from 'neverthrow'
import type { Mock } from 'vitest'
import type { Env, SessionUser } from '@/env'
import CONTEXT_KEY from '../context'
import optionalAuthenticator from './optional-authenticator'
import { validateSession } from './validate'

vi.mock('./validate', () => ({ validateSession: vi.fn() }))

function buildContext(): {
  c: Context<Env>
  // oxlint-disable-next-line typescript/no-restricted-types -- Hono の変数ストアを模す、任意値を保持する Map のため
  store: Map<string, unknown>
  next: Mock<Next>
} {
  // oxlint-disable-next-line typescript/no-restricted-types -- Hono の変数ストアを模す、任意値を保持する Map のため
  const store = new Map<string, unknown>()
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  const c = {
    // oxlint-disable-next-line typescript/no-restricted-types -- Hono の c.set を模すモックで、任意値を受けるため
    set: (key: string, value: unknown) => store.set(key, value),
    get: (key: string) => store.get(key),
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as Context<Env>
  const next: Mock<Next> = vi.fn(async () => {})
  return { c, store, next }
}

describe('optionalAuthenticator ミドルウェア', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('検証成功時は SESSION_USER をセットして次へ進むこと', async () => {
      const sessionUser: SessionUser = {
        activeUserId: 1n,
        displayName: 'テスト太郎',
        email: 'user@example.com',
      }
      vi.mocked(validateSession).mockResolvedValue(ok({ sessionUser }))

      const { c, store, next } = buildContext()
      await optionalAuthenticator(c, next)

      expect(store.get(CONTEXT_KEY.SESSION_USER)).toEqual(sessionUser)
      expect(next).toHaveBeenCalledOnce()
    })
  })

  describe('準正常系', () => {
    it('検証失敗時はエラーを投げず SESSION_USER を設定せずに次へ進むこと', async () => {
      vi.mocked(validateSession).mockResolvedValue(
        err(Object.assign(new Error('no_session'), { reason: 'no_session' as const })),
      )

      const { c, store, next } = buildContext()
      await expect(optionalAuthenticator(c, next)).resolves.not.toThrow()

      expect(store.has(CONTEXT_KEY.SESSION_USER)).toBe(false)
      expect(next).toHaveBeenCalledOnce()
    })
  })
})
