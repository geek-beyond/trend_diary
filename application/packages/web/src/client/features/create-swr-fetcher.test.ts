import { describe, expect, it, vi } from 'vitest'
import { createSWRFetcher } from './create-swr-fetcher'

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
      // biome-ignore lint/suspicious/noExplicitAny: fetchのモックの型が不明なためanyを使用
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const { fetcher } = createSWRFetcher()
      const result = await fetcher('http://example.com/api')

      expect(fetch).toHaveBeenCalledWith('http://example.com/api', {
        credentials: 'include',
      })
      expect(result).toEqual({ data: 'test' })
    })

    it('エラーレスポンスで例外を投げる', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }
      // biome-ignore lint/suspicious/noExplicitAny: fetchのモックの型が不明なためanyを使用
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const { fetcher } = createSWRFetcher()

      await expect(fetcher('http://example.com/api')).rejects.toThrow('HTTP 404: Not Found')
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
        json: unknown
        expected: unknown
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

      await expect(apiCall(mockApiFunction)).rejects.toThrow('HTTP 500: Internal Server Error')
    })
  })
})
