import type { AppLoadContext } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '@/env'
import { buildSetCookieHeaders, getAuthSession, postAuthApi } from './auth-api'

const { appRequest } = vi.hoisted(() => ({ appRequest: vi.fn() }))

vi.mock('@/server', () => ({ default: { request: appRequest } }))

function notImplemented(): never {
  throw new Error('not implemented in test')
}

function buildEnv(): Env['Bindings'] {
  return {
    DB: {
      prepare: notImplemented,
      batch: notImplemented,
      exec: notImplemented,
      withSession: notImplemented,
      dump: notImplemented,
    },
    DISCORD_WEBHOOK_URL: 'https://discord.example/webhook',
    SUPABASE_URL: 'https://supabase.example',
    SUPABASE_ANON_KEY: 'anon-key',
  }
}

function buildContext(env: Env['Bindings']): AppLoadContext {
  return { cloudflare: { env } }
}

describe('postAuthApi', () => {
  beforeEach(() => {
    appRequest.mockReset()
    appRequest.mockResolvedValue(new Response(null, { status: 200 }))
  })

  it('元リクエストのoriginで絶対URL化したURLへ、bodyをJSONとしてPOSTする', async () => {
    const request = new Request('https://trend-diary.example/login', {
      method: 'POST',
      headers: { Origin: 'https://trend-diary.example' },
    })
    const env = buildEnv()

    await postAuthApi(request, buildContext(env), '/api/auth/login', {
      email: 'test@example.com',
      password: 'Password1!',
      captchaToken: 'captcha',
    })

    const [url, init, passedEnv] = appRequest.mock.calls[0]
    expect(String(url)).toBe('https://trend-diary.example/api/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      email: 'test@example.com',
      password: 'Password1!',
      captchaToken: 'captcha',
    })
    expect(passedEnv).toBe(env)
  })

  it('Cookie・CF-Connecting-IP等の元リクエストヘッダーを転送し、Content-TypeをJSONに差し替える', async () => {
    const request = new Request('https://trend-diary.example/login', {
      method: 'POST',
      headers: {
        Cookie: 'sb-access-token=token',
        Origin: 'https://trend-diary.example',
        'CF-Connecting-IP': '203.0.113.1',
        'Content-Type': 'multipart/form-data',
        'Content-Length': '128',
      },
    })

    await postAuthApi(request, buildContext(buildEnv()), '/api/auth/login', {
      email: 'test@example.com',
    })

    const [, init] = appRequest.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Cookie')).toBe('sb-access-token=token')
    expect(headers.get('CF-Connecting-IP')).toBe('203.0.113.1')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Content-Length')).toBeNull()
  })

  // フォーム→JSON変換でhono/csrfの検査対象から外れるため、ログインCSRFはpostAuthApi自身が遮断する
  describe('クロスサイトリクエストの遮断', () => {
    it('Originが他サイトのPOSTは403を返しAPIを呼ばない', async () => {
      const request = new Request('https://trend-diary.example/login', {
        method: 'POST',
        headers: { Origin: 'https://evil.example' },
      })

      const response = await postAuthApi(request, buildContext(buildEnv()), '/api/auth/login', {
        email: 'victim@example.com',
      })

      expect(response.status).toBe(403)
      expect(appRequest).not.toHaveBeenCalled()
    })

    it('OriginもSec-Fetch-Siteも無いPOSTは403を返しAPIを呼ばない', async () => {
      const request = new Request('https://trend-diary.example/login', { method: 'POST' })

      const response = await postAuthApi(request, buildContext(buildEnv()), '/api/auth/login', {
        email: 'victim@example.com',
      })

      expect(response.status).toBe(403)
      expect(appRequest).not.toHaveBeenCalled()
    })

    it('Sec-Fetch-Siteがsame-originならOriginが無くても通す', async () => {
      const request = new Request('https://trend-diary.example/login', {
        method: 'POST',
        headers: { 'Sec-Fetch-Site': 'same-origin' },
      })

      await postAuthApi(request, buildContext(buildEnv()), '/api/auth/login', {
        email: 'test@example.com',
      })

      expect(appRequest).toHaveBeenCalled()
    })
  })
})

describe('getAuthSession', () => {
  beforeEach(() => {
    appRequest.mockReset()
    appRequest.mockResolvedValue(new Response(null, { status: 200 }))
  })

  it('Cookieを転送して/api/auth/meをGETする。副作用がないため同一オリジン検証は行わない', async () => {
    const request = new Request('https://trend-diary.example/trends', {
      headers: { Cookie: 'sb-access-token=token' },
    })
    const env = buildEnv()

    await getAuthSession(request, buildContext(env))

    const [url, init, passedEnv] = appRequest.mock.calls[0]
    expect(String(url)).toBe('https://trend-diary.example/api/auth/me')
    const headers = new Headers(init.headers)
    expect(headers.get('Cookie')).toBe('sb-access-token=token')
    expect(init.body).toBeUndefined()
    expect(passedEnv).toBe(env)
  })
})

describe('buildSetCookieHeaders', () => {
  it('レスポンスの複数のSet-Cookieを全て転送用ヘッダーへ積む', () => {
    const responseHeaders = new Headers()
    responseHeaders.append('Set-Cookie', 'sb-access-token=access; Path=/')
    responseHeaders.append('Set-Cookie', 'sb-refresh-token=refresh; Path=/')
    const response = new Response(null, { headers: responseHeaders })

    const headers = buildSetCookieHeaders(response)

    expect(headers.getSetCookie()).toEqual([
      'sb-access-token=access; Path=/',
      'sb-refresh-token=refresh; Path=/',
    ])
  })

  it('Set-Cookieがないレスポンスでは空のヘッダーを返す', () => {
    const headers = buildSetCookieHeaders(new Response(null))

    expect(headers.getSetCookie()).toEqual([])
  })
})
