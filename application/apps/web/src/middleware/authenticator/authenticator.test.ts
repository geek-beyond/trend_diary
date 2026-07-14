import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { err, ok } from 'neverthrow'
import type { Mock } from 'vitest'
import type { Env, SessionUser } from '@/env'
import CONTEXT_KEY from '../context'
import authenticator from './authenticator'
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

function authError(reason: 'no_session' | 'validation_failed' | 'user_not_found') {
  return Object.assign(new Error(reason), { reason })
}

describe('authenticator ミドルウェア', () => {
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
      await authenticator(c, next)

      expect(store.get(CONTEXT_KEY.SESSION_USER)).toEqual(sessionUser)
      expect(next).toHaveBeenCalledOnce()
    })
  })

  describe('準正常系', () => {
    // reason ごとに割り当てるステータスコードの分岐を検証する
    const testCases: Array<{
      name: string
      reason: 'no_session' | 'validation_failed' | 'user_not_found'
      status: number
    }> = [
      { name: 'セッションなしは401', reason: 'no_session', status: 401 },
      { name: '検証失敗は401', reason: 'validation_failed', status: 401 },
      { name: 'ユーザー未検出は404', reason: 'user_not_found', status: 404 },
    ]

    testCases.forEach(({ name, reason, status }) => {
      it(`${name}`, async () => {
        vi.mocked(validateSession).mockResolvedValue(err(authError(reason)))

        const { c, next } = buildContext()
        // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
        const thrown = await authenticator(c, next).catch((e: unknown) => e)

        expect(thrown).toBeInstanceOf(HTTPException)
        // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
        expect((thrown as HTTPException).status).toBe(status)
        // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
        expect((thrown as HTTPException).message).toBe('login required')
        expect(next).not.toHaveBeenCalled()
      })
    })
  })
})
