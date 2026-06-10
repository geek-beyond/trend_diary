import { Hono } from 'hono'
import type { Env } from '@/env'
import rateLimiter from '@/middleware/rate-limiter'
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
    it('レートリミッターが例外をスローした場合はフェイルオープンする', async () => {
      const errorRes = await requestAuth('/api/auth/login', buildErrorEnv())
      const skipRes = await requestAuth('/api/auth/login', TEST_ENV)

      // 例外を握りつぶして後続処理に進むため、制限スキップ時と同じ結果になる
      expect(errorRes.status).toBe(skipRes.status)
      expect(errorRes.status).not.toBe(429)
    })
  })

  // フェイルオープンの検知体制を検証する。Supabase等の後続処理が混在しないよう、
  // rateLimiterのみを載せた最小アプリで通知の有無だけを確認する
  describe('フェイルオープン検知', () => {
    const miniApp = new Hono<Env>().post('/api/auth/login', rateLimiter, (c) =>
      c.json({ ok: true }),
    )

    const mockFetch = vi.fn()

    // 通知をブロックせずバックグラウンドで送ることを検証するため、waitUntilに渡された処理を回収する
    function buildExecutionCtx() {
      const pending: Promise<unknown>[] = []
      const waitUntil = vi.fn((promise: Promise<unknown>) => {
        pending.push(promise)
      })
      const ctx = {
        waitUntil,
        passThroughOnException: () => undefined,
        // biome-ignore lint/plugin: ExecutionContextはexports/props等の実装依存メンバーを持ち構造的に代入できないため、テスト用モックには二重アサーションが避けられないため
      } as unknown as ExecutionContext
      return { ctx, waitUntil, settle: () => Promise.all(pending) }
    }

    function requestMini(env: Env['Bindings'], ctx: ExecutionContext) {
      return miniApp.request(
        '/api/auth/login',
        { method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.1' } },
        env,
        ctx,
      )
    }

    function buildErrorEnvWithWebhook(): Env['Bindings'] {
      return {
        ...buildErrorEnv(),
        DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test',
      }
    }

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch)
      mockFetch.mockResolvedValue({ ok: true, status: 204 })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      mockFetch.mockReset()
    })

    it('フェイルオープン時はwaitUntilでDiscordアラートをバックグラウンド送信する', async () => {
      const { ctx, waitUntil, settle } = buildExecutionCtx()
      await requestMini(buildErrorEnvWithWebhook(), ctx)

      // レスポンスを遅延させないよう、通知はリクエスト処理をブロックせずに送る
      expect(waitUntil).toHaveBeenCalledTimes(1)

      await settle()
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.embeds[0].title).toBe('⚠️ Rate Limiter Failing Open')
      expect(body.embeds[0].fields[0].value).toContain('/api/auth/login')
    })

    it('制限内ならアラートを送信しない', async () => {
      const { ctx, waitUntil } = buildExecutionCtx()
      await requestMini(buildEnv(true), ctx)

      expect(waitUntil).not.toHaveBeenCalled()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
