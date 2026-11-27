import { HTTPException } from 'hono/http-exception'
import { assert, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    it('トークンが有効なら検証を通す', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })))

      const result = await verifyTurnstile('secret', 'valid-token')

      assert(result.isOk())
      expect(result.value).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({ method: 'POST' }),
      )
      const body = fetchMock.mock.calls[0]?.[1]?.body
      expect(body).toBeInstanceOf(URLSearchParams)
      expect(Object.fromEntries(body)).toEqual({ secret: 'secret', response: 'valid-token' })
    })
  })

  describe('準正常系', () => {
    it('トークンが無い場合は検証を通さない', async () => {
      const result = await verifyTurnstile('secret', undefined)

      assert(result.isOk())
      expect(result.value).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it.each([
      { name: '無効トークン', response: { success: false } },
      { name: 'nullの応答', response: null },
      { name: '文字列の応答', response: 'unexpected' },
      { name: 'boolean以外のsuccess', response: { success: 1 } },
    ])('$name は検証を通さない', async ({ response }) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(response)))

      const result = await verifyTurnstile('secret', 'invalid-token')

      assert(result.isOk())
      expect(result.value).toBe(false)
    })
  })

  describe('異常系', () => {
    it('siteverifyとの通信に失敗したときは検証できずに失敗する', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))

      const result = await verifyTurnstile('secret', 'token')

      assert(result.isErr())
      expect(result.error.message).toBe('network down')
    })

    it('siteverifyの応答を解析できないときは検証できずに失敗する', async () => {
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

  describe('異常系', () => {
    it('通信に失敗したときはHTTPException(500)を送出する', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))

      const promise = assertCaptchaVerified('secret', 'token')

      await expect(promise).rejects.toBeInstanceOf(HTTPException)
      await expect(promise).rejects.toMatchObject({ status: 500, message: 'network down' })
    })
  })
})
