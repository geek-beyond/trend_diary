import { afterEach, beforeEach, vi } from 'vitest'
import { isFailure, isSuccess } from '@/common/result'
import {
  addJstDays,
  formatSummaryDateTick,
  toJaDateString,
  toJaTimeString,
  toJstDate,
  toJstDateString,
  toTodayJstDateString,
} from './date'

describe('Common Date Module', () => {
  describe('toJaDateString', () => {
    const testCases = [
      {
        name: '文字列の日付が日本語形式で正しくフォーマットされること',
        input: '2024-01-01T00:00:00Z',
        expected: '2024/1/1',
      },
      {
        name: '無効な日付文字列の場合、空文字を返すこと',
        input: 'invalid-date-string',
        expected: '',
      },
      {
        name: 'Dateの日付が日本語形式で正しくフォーマットされること',
        input: new Date('2024-01-01T00:00:00Z'),
        expected: '2024/1/1',
      },
      {
        name: '無効なDateオブジェクトの場合、空文字を返すこと',
        input: new Date('invalid-date-string'),
        expected: '',
      },
    ]

    testCases.forEach(({ name, input, expected }) => {
      it(name, () => {
        const result = toJaDateString(input)
        expect(result).toBe(expected)
      })
    })
  })

  describe('toJstDateString', () => {
    it('DateをJSTのYYYY-MM-DD形式に変換できること', () => {
      const result = toJstDateString(new Date('2024-01-01T00:00:00Z'))
      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.value).toBe('2024-01-01')
      }
    })

    it('無効なDateの場合はfailureを返すこと', () => {
      const result = toJstDateString(new Date('invalid-date'))
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toBe('無効な日付です')
      }
    })
  })

  describe('toJstDate', () => {
    it('YYYY-MM-DDをJSTのDateとして解釈できること', () => {
      const result = toJstDate('2024-01-01')
      expect(Number.isNaN(result.getTime())).toBe(false)
      expect(result.toISOString()).toBe('2023-12-31T15:00:00.000Z')
    })

    it('不正な日付文字列は無効なDateになること', () => {
      const result = toJstDate('invalid')
      expect(Number.isNaN(result.getTime())).toBe(true)
    })
  })

  describe('toJaTimeString', () => {
    it('DateをJSTのHH:mm形式に変換できること', () => {
      const result = toJaTimeString(new Date('2024-01-01T00:05:00Z'))
      expect(result).toBe('09:05')
    })

    it('無効なDateオブジェクトの場合、空文字を返すこと', () => {
      const result = toJaTimeString(new Date('invalid-date-string'))
      expect(result).toBe('')
    })
  })

  describe('toTodayJstDateString', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('現在時刻をJSTのYYYY-MM-DD形式に変換できること', () => {
      vi.setSystemTime(new Date('2024-01-01T23:30:00Z'))

      const result = toTodayJstDateString()
      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.value).toBe('2024-01-02')
      }
    })
  })

  describe('addJstDays', () => {
    it('JST基準で日付加算できること', () => {
      const result = addJstDays('2024-01-01', -1)
      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.value).toBe('2023-12-31')
      }
    })

    it('不正な日付文字列の場合はfailureを返し、詳細メッセージを保持すること', () => {
      const invalidInput = 'invalid'
      const result = addJstDays(invalidInput, 1)
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toBe(`不正な日付文字列です: ${invalidInput}`)
      }
    })
  })

  describe('formatSummaryDateTick', () => {
    it('YYYY-MM-DDを日本語の月日表記に変換できること', () => {
      const result = formatSummaryDateTick('2024-01-01')
      expect(result).toBe('1月1日')
    })

    it('文字列以外はそのまま文字列化して返すこと', () => {
      const result = formatSummaryDateTick(123)
      expect(result).toBe('123')
    })

    it('不正な日付文字列の場合、空文字を返すこと', () => {
      const result = formatSummaryDateTick('invalid')
      expect(result).toBe('')
    })
  })
})
