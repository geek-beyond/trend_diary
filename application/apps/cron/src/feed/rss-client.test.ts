import { describe, expect, it } from 'vitest'
import { backoffDelayMs } from './rss-client'

describe('backoffDelayMs', () => {
  describe('正常系', () => {
    const cases = [
      { attempt: 0, expectedMs: 1_000 },
      { attempt: 1, expectedMs: 2_000 },
      { attempt: 2, expectedMs: 4_000 },
      { attempt: 4, expectedMs: 16_000 },
    ]

    it.each(cases)(
      'attempt=$attempt のとき 2^attempt 倍の $expectedMs ms を返す',
      ({ attempt, expectedMs }) => {
        expect(backoffDelayMs(attempt)).toBe(expectedMs)
      },
    )

    const clampCases = [
      { attempt: 5, expectedMs: 30_000 },
      { attempt: 10, expectedMs: 30_000 },
    ]

    it.each(clampCases)(
      'attempt=$attempt で理論値が上限を超える場合は $expectedMs ms にクランプする',
      ({ attempt, expectedMs }) => {
        expect(backoffDelayMs(attempt)).toBe(expectedMs)
      },
    )
  })
})
