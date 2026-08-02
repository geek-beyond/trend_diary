import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nonOkResponse } from '../test-helper/feed'
import { fetchRssFeed, RssFetchError } from './rss-client'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('RssFetchError', () => {
  describe('正常系', () => {
    const cases = [
      { status: 429, expected: true },
      { status: 403, expected: false },
      { status: 503, expected: false },
    ]

    it.each(cases)(
      'status=$status のとき isRateLimited は $expected を返す',
      ({ status, expected }) => {
        const error = new RssFetchError('https://zenn.dev/feed', { status, headers: {} })

        expect(error.isRateLimited).toBe(expected)
      },
    )
  })
})

describe('fetchRssFeed', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  describe('異常系', () => {
    it('非ok応答は RssFetchError として status・診断ヘッダ・本文先頭を残す', async () => {
      fetchMock.mockResolvedValue(
        nonOkResponse(429, 'Rate limited by origin', {
          'retry-after': '30',
          'cf-ray': '8abc',
          'cf-mitigated': 'challenge',
          server: 'cloudflare',
        }),
      )

      const result = await fetchRssFeed('https://zenn.dev/feed')

      const error = result._unsafeUnwrapErr()
      expect(error).toBeInstanceOf(RssFetchError)
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
  })
})
