import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backoffDelayMs, fetchRssFeed, RssFetchError } from './rss-client'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('backoffDelayMs', () => {
  describe('正常系', () => {
    const cases = [
      { attempt: 0, expectedMs: 1_000 },
      { attempt: 1, expectedMs: 2_000 },
      { attempt: 2, expectedMs: 4_000 },
      { attempt: 4, expectedMs: 16_000 },
      // attempt=5以降は理論値(2^attempt×base)が上限を超えるため30,000msにクランプされる
      { attempt: 5, expectedMs: 30_000 },
      { attempt: 10, expectedMs: 30_000 },
    ]

    it.each(cases)('attempt=$attempt のとき $expectedMs ms を返す', ({ attempt, expectedMs }) => {
      expect(backoffDelayMs(attempt)).toBe(expectedMs)
    })
  })
})

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
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({
          'retry-after': '30',
          'cf-ray': '8abc',
          'cf-mitigated': 'challenge',
          server: 'cloudflare',
        }),
        text: async () => 'Rate limited by origin',
      })

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

    it('429応答はリトライせず1回の試行で失敗を返す', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '281', server: 'cloudflare' }),
        text: async () => 'error code: 1015',
      })

      const result = await fetchRssFeed('https://zenn.dev/feed')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(RssFetchError)
    })

    it('429以外の非ok応答は上限回数までリトライする', async () => {
      vi.useFakeTimers()
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ server: 'cloudflare' }),
        text: async () => 'Service Unavailable',
      })

      const promise = fetchRssFeed('https://zenn.dev/feed')
      await vi.runAllTimersAsync()
      const result = await promise
      vi.useRealTimers()

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(RssFetchError)
    })

    it('本文が上限を超える場合は先頭のみを残す', async () => {
      vi.useFakeTimers()
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ server: 'cloudflare' }),
        text: async () => 'x'.repeat(600),
      })

      const promise = fetchRssFeed('https://zenn.dev/feed')
      await vi.runAllTimersAsync()
      const result = await promise
      vi.useRealTimers()

      const error = result._unsafeUnwrapErr()
      expect(error).toBeInstanceOf(RssFetchError)
      expect(error).toMatchObject({ diagnostics: { bodySnippet: `${'x'.repeat(500)}…` } })
    })
  })
})
