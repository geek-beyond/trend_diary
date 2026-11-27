import Logger from '@trend-diary/logger'
import type { Env } from '@/env'
import serverApp from '@/server'
import TEST_ENV from '@/test/env'

// limit()の結果を制御してレートリミットの挙動を検証する
function buildEnv(success: boolean): Env['Bindings'] {
  return {
    ...TEST_ENV,
    AUTH_RATE_LIMITER: {
      limit: vi.fn(async () => ({ success })),
    },
  }
}

// limit()が例外をスローする障害時を再現する
function buildErrorEnv(error: Error): Env['Bindings'] {
  return {
    ...TEST_ENV,
    AUTH_RATE_LIMITER: {
      limit: async () => {
        throw error
      },
    },
  }
}

function requestAuth(path: string, env: Env['Bindings'], ip?: string) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (ip) headers.set('CF-Connecting-IP', ip)
  return serverApp.request(
    path,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: 'invalid-email', password: 'short' }),
    },
    env,
  )
}

describe('レートリミットミドルウェア', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('正常系', () => {
    // 認証サービスの状態に依存せず、後続の入力検証まで到達したことを判別するため不正入力を使う。
    const testCases: Array<{ name: string; env: Env['Bindings'] }> = [
      { name: '制限内なら後続処理に進む', env: buildEnv(true) },
      { name: 'バインディング未設定ならスキップする', env: TEST_ENV },
    ]

    testCases.forEach(({ name, env }) => {
      it(`${name}（入力検証の422まで進む）`, async () => {
        const res = await requestAuth('/api/sessions', env, '203.0.113.8')
        expect(res.status).toBe(422)
        if (env.AUTH_RATE_LIMITER) {
          expect(env.AUTH_RATE_LIMITER.limit).toHaveBeenCalledWith({
            key: '/api/sessions:203.0.113.8',
          })
        }
      })
    })
  })

  describe('準正常系', () => {
    const testCases: Array<{ name: string; path: string }> = [
      { name: 'login', path: '/api/sessions' },
      { name: 'signup', path: '/api/registrations' },
    ]

    testCases.forEach(({ name, path }) => {
      it(`${name} は制限超過時に429を返す`, async () => {
        const env = buildEnv(false)
        const res = await requestAuth(path, env)
        expect(res.status).toBe(429)
        expect(env.AUTH_RATE_LIMITER?.limit).toHaveBeenCalledWith({ key: `${path}:unknown` })
      })
    })
  })

  describe('異常系', () => {
    // 認証エンドポイントではブルートフォースを許す方が危険なため、障害時はフェイルセーフで止める
    const testCases: Array<{ name: string; path: string }> = [
      { name: 'login', path: '/api/sessions' },
      { name: 'signup', path: '/api/registrations' },
    ]

    testCases.forEach(({ name, path }) => {
      it(`${name} はレートリミッター障害時にフェイルセーフで503を返す`, async () => {
        const failure = new Error('rate limiter unavailable')
        const errorLog = vi.spyOn(Logger.prototype, 'error')
        const res = await requestAuth(path, buildErrorEnv(failure))
        expect(res.status).toBe(503)
        expect(errorLog).toHaveBeenCalledWith(
          expect.objectContaining({ event: 'rate_limiter_fail_closed', path }),
          failure,
        )
        expect(errorLog).toHaveBeenCalledWith(
          expect.objectContaining({ status: 503 }),
          expect.objectContaining({ cause: failure }),
        )
      })
    })
  })
})
