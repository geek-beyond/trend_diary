import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import createSWRFetcher from './create-swr-fetcher'
import HttpError from './http-error'

global.fetch = vi.fn()

describe('createSWRFetcher', () => {
  describe('基本動作', () => {
    it('createSWRFetcherが正しくオブジェクトを返す', () => {
      const result = createSWRFetcher()

      expect(result).toBeDefined()
      expect(typeof result.fetcher).toBe('function')
      expect(typeof result.apiCall).toBe('function')
      expect(result.client).toBeDefined()
    })
  })

  describe('fetcher関数', () => {
    it('正常なレスポンスでJSONを返す', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: 'test' }),
      }
      // oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- テスト用に最小限のフィールドだけ持つモックを Response として渡す必要があるため、any と型アサーションを許可する
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const { fetcher } = createSWRFetcher()
      const result = await fetcher('http://example.com/api')

      expect(fetch).toHaveBeenCalledWith(
        'http://example.com/api',
        expect.objectContaining({
          credentials: 'include',
          // ハング防止のためタイムアウトsignalを付与している
          signal: expect.any(AbortSignal),
        }),
      )
      expect(result).toEqual({ data: 'test' })
    })

    it('エラーレスポンスで例外を投げる', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }
      // oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- テスト用に最小限のフィールドだけ持つモックを Response として渡す必要があるため、any と型アサーションを許可する
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const { fetcher } = createSWRFetcher()

      const promise = fetcher('http://example.com/api')
      await expect(promise).rejects.toBeInstanceOf(HttpError)
      await expect(promise).rejects.toHaveProperty('status', 404)
    })

    it('401の場合はセッション切れの案内トーストを表示する', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }
      // oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- テスト用に最小限のフィールドだけ持つモックを Response として渡す必要があるため、any と型アサーションを許可する
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const { fetcher } = createSWRFetcher()

      const promise = fetcher('http://example.com/api')
      await expect(promise).rejects.toBeInstanceOf(HttpError)
      expect(toast.error).toHaveBeenCalledWith(
        'セッションの有効期限が切れました。再度ログインしてください。',
        { id: 'session-expired' },
      )
    })
  })

  describe('apiCall関数', () => {
    it('ClientResponse互換オブジェクトを受け取れる', async () => {
      const mockApiFunction = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ data: 'typed' }),
      })

      const { apiCall } = createSWRFetcher()
      const result = await apiCall<{ data: string }>(mockApiFunction)

      expect(result).toEqual({ data: 'typed' })
    })

    describe('正常なレスポンス(200番台)', () => {
      const testCases: Array<{
        outline: string
        status: number
        json: object | null
        expected: object | null
        expect: string
      }> = [
        {
          outline: '204 OKの場合 (JSONが含まれていない)',
          status: 204,
          json: null,
          expected: null,
          expect: 'nullを返す',
        },
        {
          outline: '204 OKの場合 (JSONが含まれている)',
          status: 204,
          json: { dummy: 'data' },
          expected: null,
          expect: 'nullを返す',
        },
        {
          outline: '204 以外の場合',
          status: 200,
          json: { success: true },
          expected: { success: true },
          expect: 'JSONデータを返す',
        },
      ]

      testCases.forEach((testCase) => {
        it(`${testCase.outline}-${testCase.expect}`, async () => {
          const mockResponse = {
            ok: true,
            status: testCase.status,
            json: vi.fn().mockResolvedValue(testCase.json),
          }
          const mockApiFunction = vi.fn().mockResolvedValue(mockResponse)

          const { apiCall } = createSWRFetcher()
          const result = await apiCall(mockApiFunction)

          expect(mockApiFunction).toHaveBeenCalled()
          expect(result).toEqual(testCase.expected)
        })
      })
    })

    it('エラーレスポンスで例外を投げる', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }
      const mockApiFunction = vi.fn().mockResolvedValue(mockResponse)

      const { apiCall } = createSWRFetcher()

      const promise = apiCall(mockApiFunction)
      await expect(promise).rejects.toBeInstanceOf(HttpError)
      await expect(promise).rejects.toHaveProperty('status', 500)
    })
  })
})
