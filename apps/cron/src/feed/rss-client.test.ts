import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backoffDelayMs, fetchRssFeed, RssFetchError } from './rss-client'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function nonOkResponse(status: number, body: string, headers: Record<string, string> = {}) {
  return { ok: false, status, headers: new Headers(headers), text: async () => body }
}

// リトライ間のバックオフを実時間で待たないよう、fake timer 下で全試行を進めてから結果を受け取る
async function fetchRssFeedWithTimersAdvanced(url: string) {
  vi.useFakeTimers()
  const promise = fetchRssFeed(url)
  await vi.runAllTimersAsync()
  const result = await promise
  vi.useRealTimers()
  return result
}

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

    it('429応答はリトライせず1回の試行で失敗を返す', async () => {
      fetchMock.mockResolvedValue(
        nonOkResponse(429, 'error code: 1015', { 'retry-after': '281', server: 'cloudflare' }),
      )

      const result = await fetchRssFeed('https://zenn.dev/feed')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(RssFetchError)
    })

    it('429以外の非ok応答は上限回数までリトライする', async () => {
      fetchMock.mockResolvedValue(nonOkResponse(503, 'Service Unavailable'))

      const result = await fetchRssFeedWithTimersAdvanced('https://zenn.dev/feed')

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(RssFetchError)
    })

    it('本文が上限を超える場合は先頭のみを残す', async () => {
      fetchMock.mockResolvedValue(nonOkResponse(503, 'x'.repeat(600)))

      const result = await fetchRssFeedWithTimersAdvanced('https://zenn.dev/feed')

      const error = result._unsafeUnwrapErr()
      expect(error).toBeInstanceOf(RssFetchError)
      expect(error).toMatchObject({ diagnostics: { bodySnippet: `${'x'.repeat(500)}…` } })
    })
  })
})
