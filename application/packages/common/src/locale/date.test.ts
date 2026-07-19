import { addJstDays, toJstDate, toJstDateString } from './date'

describe('Common Date Module', () => {
  describe('toJstDateString', () => {
    it('DateをJSTのYYYY-MM-DD形式に変換できること', () => {
      const result = toJstDateString(new Date('2024-01-01T00:00:00Z'))
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe('2024-01-01')
      }
    })

    it('無効なDateの場合はfailureを返すこと', () => {
      const result = toJstDateString(new Date('invalid-date'))
      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
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

  describe('addJstDays', () => {
    it('JST基準で日付加算できること', () => {
      expect(addJstDays('2024-01-01', -1)).toBe('2023-12-31')
    })

    // 検証済み・内部生成の文字列を渡す契約のため、不正な文字列は契約違反として送出する
    it('不正な日付文字列の場合は契約違反として送出すること', () => {
      const invalidInput = 'invalid'
      expect(() => addJstDays(invalidInput, 1)).toThrow(`Invalid date string: ${invalidInput}`)
    })
  })
})
