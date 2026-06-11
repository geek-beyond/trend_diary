import type { AppLoadContext } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '@/env'
import { buildSetCookieHeaders, callAuthApi } from './auth-api'

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

describe('callAuthApi', () => {
  beforeEach(() => {
    appRequest.mockReset()
    appRequest.mockResolvedValue(new Response(null, { status: 200 }))
  })

  it('csrfのOrigin照合を通すため、元リクエストのoriginで絶対URL化したURLでHono appを呼び出す', async () => {
    const request = new Request('https://trend-diary.example/login', { method: 'POST' })

    await callAuthApi(request, buildContext(buildEnv()), {
      path: '/api/auth/login',
      method: 'POST',
      body: { email: 'test@example.com' },
    })

    const [url] = appRequest.mock.calls[0]
    expect(String(url)).toBe('https://trend-diary.example/api/auth/login')
  })

  it('Cookie・Origin等の元リクエストヘッダーを転送し、Content-TypeをJSONに差し替える', async () => {
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

    await callAuthApi(request, buildContext(buildEnv()), {
      path: '/api/auth/login',
      method: 'POST',
      body: { email: 'test@example.com' },
    })

    const [, init] = appRequest.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Cookie')).toBe('sb-access-token=token')
    expect(headers.get('Origin')).toBe('https://trend-diary.example')
    expect(headers.get('CF-Connecting-IP')).toBe('203.0.113.1')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Content-Length')).toBeNull()
  })

  it('bodyをJSON文字列として送信し、envをHono appの第3引数に渡す', async () => {
    const request = new Request('https://trend-diary.example/login', { method: 'POST' })
    const env = buildEnv()

    await callAuthApi(request, buildContext(env), {
      path: '/api/auth/login',
      method: 'POST',
      body: { email: 'test@example.com', password: 'Password1!', captchaToken: 'captcha' },
    })

    const [, init, passedEnv] = appRequest.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      email: 'test@example.com',
      password: 'Password1!',
      captchaToken: 'captcha',
    })
    expect(passedEnv).toBe(env)
  })

  it('bodyを指定しない場合はボディなしのリクエストを送る', async () => {
    const request = new Request('https://trend-diary.example/trends')

    await callAuthApi(request, buildContext(buildEnv()), { path: '/api/auth/me', method: 'GET' })

    const [, init] = appRequest.mock.calls[0]
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
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
