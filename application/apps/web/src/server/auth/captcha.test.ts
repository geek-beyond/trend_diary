import { ClientError, ServerError } from '@trend-diary/common/errors'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifyTurnstile } from './captcha'

const fetchMock = vi.fn()

describe('verifyTurnstile', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('secret未設定の場合は検証をスキップして許可する', async () => {
      const result = await verifyTurnstile(undefined, 'any-token')

      expect(result.isOk()).toBe(true)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('siteverifyがsuccess:trueを返す場合は許可する', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })))

      const result = await verifyTurnstile('secret', 'valid-token')

      expect(result.isOk()).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  describe('異常系', () => {
    it('secret設定済みでtokenが無い場合はClientError(403)を返す', async () => {
      const result = await verifyTurnstile('secret', undefined)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ClientError)
        if (result.error instanceof ClientError) {
          expect(result.error.statusCode).toBe(403)
        }
      }
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('siteverifyがsuccess:falseを返す場合はClientError(403)を返す', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false })))

      const result = await verifyTurnstile('secret', 'invalid-token')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ClientError)
      }
    })

    it('fetchが例外を投げる場合はServerErrorを返す', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))

      const result = await verifyTurnstile('secret', 'token')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ServerError)
      }
    })

    it('レスポンスのJSON解析に失敗する場合はServerErrorを返す', async () => {
      fetchMock.mockResolvedValue(new Response('not-json'))

      const result = await verifyTurnstile('secret', 'token')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ServerError)
      }
    })
  })
})
