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

describe('fetchRssFeed', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  describe('異常系', () => {
    it('非ok応答は RssFetchError として status・診断ヘッダ・本文先頭を残す', async () => {
      vi.useFakeTimers()
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

      const promise = fetchRssFeed('https://zenn.dev/feed')
      await vi.runAllTimersAsync()
      const result = await promise
      vi.useRealTimers()

      expect(result.isErr()).toBe(true)
      if (result.isErr() && result.error instanceof RssFetchError) {
        expect(result.error.diagnostics).toEqual({
          status: 429,
          headers: {
            'retry-after': '30',
            'cf-ray': '8abc',
            'cf-mitigated': 'challenge',
            server: 'cloudflare',
          },
          bodySnippet: 'Rate limited by origin',
        })
      }
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

      expect(result.isErr()).toBe(true)
      if (result.isErr() && result.error instanceof RssFetchError) {
        expect(result.error.diagnostics.bodySnippet).toBe(`${'x'.repeat(500)}…`)
      }
    })
  })
})
