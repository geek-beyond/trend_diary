import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backoffDelayMs, parseRetryAfterMs, retryDelayMs } from './rss-client'

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

describe('parseRetryAfterMs', () => {
  // 現在時刻に依存する HTTP-date の検証を安定させるため基準時刻を固定する
  const now = new Date('2026-07-19T00:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('正常系', () => {
    it('delta-seconds を待機ミリ秒へ変換する', () => {
      expect(parseRetryAfterMs('30')).toBe(30_000)
    })

    it('HTTP-date は現在時刻との差分を待機ミリ秒として返す', () => {
      expect(parseRetryAfterMs('Sun, 19 Jul 2026 00:00:10 GMT')).toBe(10_000)
    })

    it('HTTP-date は基準時刻(Dateヘッダ)が指定されれば時刻ズレを避けてその差分を返す', () => {
      expect(
        parseRetryAfterMs('Sun, 19 Jul 2026 00:00:10 GMT', 'Sun, 19 Jul 2026 00:00:05 GMT'),
      ).toBe(5_000)
    })

    it('基準時刻(Dateヘッダ)が不正なら現在時刻へフォールバックする', () => {
      expect(parseRetryAfterMs('Sun, 19 Jul 2026 00:00:10 GMT', 'invalid-date')).toBe(10_000)
    })

    it('過去の HTTP-date は待機不要として0を返す', () => {
      expect(parseRetryAfterMs('Sat, 18 Jul 2026 23:59:50 GMT')).toBe(0)
    })
  })

  describe('準正常系', () => {
    const invalidCases = [
      { name: '未指定(null)', value: null },
      { name: '未指定(undefined)', value: undefined },
      { name: '空文字', value: '' },
      { name: '数値でも日付でもない文字列', value: 'soon' },
      { name: '負の秒数', value: '-5' },
      { name: '小数の秒数', value: '1.5' },
    ]

    it.each(invalidCases)('$name のとき undefined を返す', ({ value }) => {
      expect(parseRetryAfterMs(value)).toBeUndefined()
    })
  })
})

describe('retryDelayMs', () => {
  describe('正常系', () => {
    it('retryAfterMs が無ければ指数バックオフの値を返す', () => {
      expect(retryDelayMs(2)).toBe(backoffDelayMs(2))
    })

    it('retryAfterMs が指定されれば指数バックオフより優先する', () => {
      expect(retryDelayMs(0, 5_000)).toBe(5_000)
    })

    it('retryAfterMs が上限を超える場合は上限(30,000ms)へクランプする', () => {
      expect(retryDelayMs(0, 120_000)).toBe(30_000)
    })
  })
})
