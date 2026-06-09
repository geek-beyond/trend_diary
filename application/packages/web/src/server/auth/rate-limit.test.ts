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
        headers: { 'Content-Type': 'application/json' },
      },
      env,
    )
  }

  describe('制限を超過した場合', () => {
    it('login は429を返す', async () => {
      const res = await requestAuth('/api/auth/login', buildEnv(false))
      expect(res.status).toBe(429)
    })

    it('signup は429を返す', async () => {
      const res = await requestAuth('/api/auth/signup', buildEnv(false))
      expect(res.status).toBe(429)
    })
  })

  describe('制限内の場合', () => {
    it('429にはならず後続処理に進む', async () => {
      // 存在しないユーザーのため後続のログイン処理で401となるが、429でないことを確認する
      const res = await requestAuth('/api/auth/login', buildEnv(true))
      expect(res.status).not.toBe(429)
    })
  })

  describe('バインディング未設定の場合', () => {
    it('レートリミットをスキップし429にはならない', async () => {
      const res = await requestAuth('/api/auth/login', TEST_ENV)
      expect(res.status).not.toBe(429)
    })
  })

  describe('レートリミッターが例外をスローした場合', () => {
    it('フェイルオープンしバインディング未設定時と同じ挙動になる', async () => {
      const errorRes = await requestAuth('/api/auth/login', buildErrorEnv())
      const skipRes = await requestAuth('/api/auth/login', TEST_ENV)

      // 例外を握りつぶして後続処理に進むため、制限スキップ時と同じ結果になる
      expect(errorRes.status).toBe(skipRes.status)
      expect(errorRes.status).not.toBe(429)
    })
  })
})
