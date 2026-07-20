import { afterEach, describe, expect, it, vi } from 'vitest'
import * as dateModule from '@/common/locale/date'
import { getTodayJst, sumSourceSummary } from './daily-summary'

describe('daily-summary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getTodayJst', () => {
    it('JSTの日付文字列を返す', () => {
      vi.spyOn(dateModule, 'toTodayJstDateString').mockReturnValue('2026-03-08')

      expect(getTodayJst()).toBe('2026-03-08')
    })

    it('JST解決に失敗したら例外が伝播する', () => {
      vi.spyOn(dateModule, 'toTodayJstDateString').mockImplementation(() => {
        throw new Error('Failed to resolve JST date parts')
      })

      expect(() => getTodayJst()).toThrow('Failed to resolve JST date parts')
    })
  })

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
