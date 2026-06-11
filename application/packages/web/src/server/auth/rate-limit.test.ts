import type { Env } from '@/env'
import TEST_ENV from '@/test/env'
import app from '../../server'

describe('認証エンドポイントのレートリミット', () => {
  // limit()の結果を制御してレートリミットの挙動を検証する
  function buildEnv(success: boolean): Env['Bindings'] {
    return {
      ...TEST_ENV,
      AUTH_RATE_LIMITER: {
        limit: async () => ({ success }),
      },
    }
  }

  // limit()が例外をスローする障害時を再現する
  function buildErrorEnv(): Env['Bindings'] {
    return {
      ...TEST_ENV,
      AUTH_RATE_LIMITER: {
        limit: async () => {
          throw new Error('rate limiter unavailable')
        },
      },
    }
  }

  function requestAuth(path: string, env: Env['Bindings']) {
    return app.request(
      path,
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'rate-limit-test@example.com',
          password: 'Test@password123',
        }),
        headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' },
      },
      env,
    )
  }

  describe('正常系', () => {
    // 後続のログイン処理で401となるが、ここでは制限されず429にならないことを確認する
    const testCases: Array<{ name: string; env: Env['Bindings'] }> = [
      { name: '制限内なら後続処理に進む', env: buildEnv(true) },
      { name: 'バインディング未設定ならスキップする', env: TEST_ENV },
    ]

    testCases.forEach(({ name, env }) => {
      it(`${name}（429にならない）`, async () => {
        const res = await requestAuth('/api/auth/login', env)
        expect(res.status).not.toBe(429)
      })
    })
  })

  describe('準正常系', () => {
    const testCases: Array<{ name: string; path: string }> = [
      { name: 'login', path: '/api/auth/login' },
      { name: 'signup', path: '/api/auth/signup' },
    ]

    testCases.forEach(({ name, path }) => {
      it(`${name} は制限超過時に429を返す`, async () => {
        const res = await requestAuth(path, buildEnv(false))
        expect(res.status).toBe(429)
      })
    })
  })

  describe('異常系', () => {
    // 認証エンドポイントではブルートフォースを許す方が危険なため、障害時はフェイルセーフで止める
    const testCases: Array<{ name: string; path: string }> = [
      { name: 'login', path: '/api/auth/login' },
      { name: 'signup', path: '/api/auth/signup' },
    ]

    testCases.forEach(({ name, path }) => {
      it(`${name} はレートリミッター障害時にフェイルセーフで503を返す`, async () => {
        const res = await requestAuth(path, buildErrorEnv())
        expect(res.status).toBe(503)
      })
    })
  })
})
