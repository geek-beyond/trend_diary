import { describe, expect, it } from 'vitest'
import { backoffDelayMs } from './rss-client'

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
