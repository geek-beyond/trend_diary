import { isNull } from './utility'

describe('typeUtility', () => {
  describe('isNull', () => {
    it('nullを渡すとtrueを返す', () => {
      expect(isNull(null)).toBe(true)
    })

    it('undefined、オブジェクト、プリミティブ値を渡すとfalseを返す', () => {
      expect(isNull(undefined)).toBe(false)
      expect(isNull({})).toBe(false)
      expect(isNull([])).toBe(false)
      expect(isNull(0)).toBe(false)
      expect(isNull('')).toBe(false)
      expect(isNull(false)).toBe(false)
    })
  })
})
