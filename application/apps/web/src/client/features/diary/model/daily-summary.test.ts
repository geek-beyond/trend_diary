import { err, ok } from 'neverthrow'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as dateModule from '@/common/locale/date'
import { getTodayJst, sumSourceSummary } from './daily-summary'

describe('daily-summary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getTodayJst', () => {
    it('JSTの日付文字列を返す', () => {
      vi.spyOn(dateModule, 'toTodayJstDateString').mockReturnValue(ok('2026-03-08'))

      expect(getTodayJst()).toBe('2026-03-08')
    })

    it('JST解決に失敗したら例外を投げる', () => {
      vi.spyOn(dateModule, 'toTodayJstDateString').mockReturnValue(
        err(new Error('JST日付の取得に失敗しました')),
      )

      expect(() => getTodayJst()).toThrow('JST日付の取得に失敗しました')
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
