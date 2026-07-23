import type { Context, Next } from 'hono'
import type { Mock } from 'vitest'
import type { Env } from '@/env'
import CONTEXT_KEY from './context'
import requestLogger from './request-logger'

const { loggerCtor } = vi.hoisted(() => ({ loggerCtor: vi.fn() }))
vi.mock('@trend-diary/logger', () => ({
  default: class {
    constructor(level: string) {
      loggerCtor(level)
    }
    with() {
      return { info: vi.fn() }
    }
  },
}))

function buildContext(logLevel: string | undefined): {
  c: Context<Env>
  // oxlint-disable-next-line typescript/no-restricted-types -- Hono の変数ストアを模す、任意値を保持する Map のため
  store: Map<string, unknown>
  next: Mock<Next>
} {
  // oxlint-disable-next-line typescript/no-restricted-types -- Hono の変数ストアを模す、任意値を保持する Map のため
  const store = new Map<string, unknown>()
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  const c = {
    req: {
      method: 'GET',
      path: '/api/x',
      header: (name: string) => (name === 'user-agent' ? 'test-agent' : undefined),
    },
    env: { LOG_LEVEL: logLevel },
    res: { status: 200 },
    // oxlint-disable-next-line typescript/no-restricted-types -- Hono の c.set を模すモックで、任意値を受けるため
    set: (key: string, value: unknown) => store.set(key, value),
    get: (key: string) => store.get(key),
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as Context<Env>
  const next: Mock<Next> = vi.fn(async () => {})
  return { c, store, next }
}

describe('requestLogger ミドルウェア', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('APP_LOG をセットして次へ進むこと', async () => {
      const { c, store, next } = buildContext('silent')
      await requestLogger(c, next)

      expect(store.get(CONTEXT_KEY.APP_LOG)).toBeDefined()
      expect(next).toHaveBeenCalledOnce()
    })

    // LOG_LEVEL の解決分岐（設定値尊重 / 未設定時のフォールバック）を検証する
    const testCases: Array<{ name: string; logLevel: string | undefined; resolved: string }> = [
      { name: '設定値があれば尊重する', logLevel: 'silent', resolved: 'silent' },
      { name: '空文字はデフォルトへフォールバックする', logLevel: '', resolved: 'info' },
      { name: '空白のみはデフォルトへフォールバックする', logLevel: '   ', resolved: 'info' },
      { name: '未設定はデフォルトへフォールバックする', logLevel: undefined, resolved: 'info' },
    ]

    testCases.forEach(({ name, logLevel, resolved }) => {
      it(`${name}`, async () => {
        const { c, next } = buildContext(logLevel)
        await requestLogger(c, next)

        expect(loggerCtor).toHaveBeenCalledWith(resolved)
      })
    })
  })
})
