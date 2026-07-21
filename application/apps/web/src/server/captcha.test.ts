import { HTTPException } from 'hono/http-exception'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertCaptchaVerified, verifyTurnstile } from './captcha'

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('verifyTurnstile', () => {
  describe('正常系', () => {
    it('siteverifyがsuccess:trueを返す場合はok(true)を返す', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })))

      const result = await verifyTurnstile('secret', 'valid-token')

      expect(result._unsafeUnwrap()).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  describe('準正常系', () => {
    it('secret設定済みでtokenが無い場合はok(false)を返す', async () => {
      const result = await verifyTurnstile('secret', undefined)

      expect(result._unsafeUnwrap()).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('siteverifyがsuccess:falseを返す場合はok(false)を返す', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false })))

      const result = await verifyTurnstile('secret', 'invalid-token')

      expect(result._unsafeUnwrap()).toBe(false)
    })
  })

  describe('異常系', () => {
    it('fetchが例外を投げる場合はerrを返す', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))

      const result = await verifyTurnstile('secret', 'token')

      expect(result._unsafeUnwrapErr().message).toBe('network down')
    })

    it('レスポンスのJSON解析に失敗する場合はerrを返す', async () => {
      fetchMock.mockResolvedValue(new Response('not-json'))

      const result = await verifyTurnstile('secret', 'token')

      expect(result.isErr()).toBe(true)
    })
  })
})

describe('assertCaptchaVerified', () => {
  describe('正常系', () => {
    it('secret未設定のときは検証を行わず解決する', async () => {
      await expect(assertCaptchaVerified(undefined, 'token')).resolves.toBeUndefined()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('検証に成功したときは解決する', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })))

      await expect(assertCaptchaVerified('secret', 'valid-token')).resolves.toBeUndefined()
    })
  })

  describe('準正常系', () => {
    it('検証に失敗したときはHTTPException(403)を送出する', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false })))

      const promise = assertCaptchaVerified('secret', 'invalid-token')

      await expect(promise).rejects.toBeInstanceOf(HTTPException)
      await expect(promise).rejects.toMatchObject({ status: 403 })
    })
  })
})
