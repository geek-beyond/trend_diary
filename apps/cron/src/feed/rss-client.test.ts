import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nonOkResponse } from '../test-helper/feed'
import { fetchRssFeed, RssFetchError } from './rss-client'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('fetchRssFeed', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  describe('異常系', () => {
    it('非ok応答は RssFetchError として status・診断ヘッダ・本文先頭を残す', async () => {
      fetchMock.mockResolvedValue(
        nonOkResponse(429, 'Rate limited by origin', {
          'retry-after': '30',
          date: 'Thu, 01 Jan 1970 00:00:00 GMT',
          'cf-ray': '8abc',
          'cf-mitigated': 'challenge',
          'cf-cache-status': 'DYNAMIC',
          server: 'cloudflare',
        }),
      )

      const result = await fetchRssFeed('https://zenn.dev/feed')

      const error = result._unsafeUnwrapErr()
      expect(error).toBeInstanceOf(RssFetchError)
      expect(error.name).toBe('RssFetchError')
      expect(error).toMatchObject({
        diagnostics: {
          status: 429,
          headers: {
            'retry-after': '30',
            'cf-ray': '8abc',
            'cf-mitigated': 'challenge',
            server: 'cloudflare',
          },
          bodySnippet: 'Rate limited by origin',
        },
      })
      if (error instanceof RssFetchError) {
        expect(error.diagnostics.headers).toEqual({
          'retry-after': '30',
          date: 'Thu, 01 Jan 1970 00:00:00 GMT',
          'cf-ray': '8abc',
          'cf-mitigated': 'challenge',
          'cf-cache-status': 'DYNAMIC',
          server: 'cloudflare',
        })
      }
    })

    it('失敗しても run 内でリトライせず1回の試行で失敗を返す', async () => {
      fetchMock.mockResolvedValue(
        nonOkResponse(429, 'error code: 1015', { 'retry-after': '281', server: 'cloudflare' }),
      )

      const result = await fetchRssFeed('https://zenn.dev/feed')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(RssFetchError)
    })

    it('本文が上限を超える場合は先頭のみを残す', async () => {
      fetchMock.mockResolvedValue(nonOkResponse(503, 'x'.repeat(600)))

      const result = await fetchRssFeed('https://zenn.dev/feed')

      const error = result._unsafeUnwrapErr()
      expect(error).toBeInstanceOf(RssFetchError)
      expect(error).toMatchObject({ diagnostics: { bodySnippet: `${'x'.repeat(500)}…` } })
    })

    it('本文が上限と同じ長さなら省略記号を付けない', async () => {
      fetchMock.mockResolvedValue(nonOkResponse(503, 'x'.repeat(500)))

      const result = await fetchRssFeed('https://zenn.dev/feed')

      const error = result._unsafeUnwrapErr()
      expect(error).toBeInstanceOf(RssFetchError)
      expect(error).toMatchObject({ diagnostics: { bodySnippet: 'x'.repeat(500) } })
    })

    it('本文が空白だけなら本文診断を持たない', async () => {
      fetchMock.mockResolvedValue(nonOkResponse(503, '  \n\t  '))

      const result = await fetchRssFeed('https://zenn.dev/feed')

      const error = result._unsafeUnwrapErr()
      expect(error).toBeInstanceOf(RssFetchError)
      if (error instanceof RssFetchError) {
        expect(error.diagnostics).toEqual({ status: 503, headers: {} })
      }
    })

    it('本文を読み取れなくてもRSS取得エラーを診断情報なしで返す', async () => {
      const response = nonOkResponse(503, 'body')
      vi.spyOn(response, 'text').mockRejectedValue(new Error('body read failed'))
      fetchMock.mockResolvedValue(response)

      const result = await fetchRssFeed('https://zenn.dev/feed')

      const error = result._unsafeUnwrapErr()
      expect(error).toBeInstanceOf(RssFetchError)
      if (error instanceof RssFetchError) {
        expect(error.diagnostics).toEqual({ status: 503, headers: {} })
      }
    })
  })
})
