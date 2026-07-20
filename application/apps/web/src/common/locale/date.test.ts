import { describe, expect, it } from 'vitest'
import { formatSummaryDateTick, toJaDateString, toJaTimeString } from './date'

describe('Web Locale Module', () => {
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
