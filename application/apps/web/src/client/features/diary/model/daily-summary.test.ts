import { describe, expect, it } from 'vitest'
import { sumSourceSummary } from './daily-summary'

describe('daily-summary', () => {
  describe('sumSourceSummary', () => {
    it('read/skipを合算する', () => {
      expect(
        sumSourceSummary([
          { read: 3, skip: 1 },
          { read: 2, skip: 4 },
          { read: 0, skip: 0 },
        ]),
      ).toEqual({ read: 5, skip: 5 })
    })
  })
})
