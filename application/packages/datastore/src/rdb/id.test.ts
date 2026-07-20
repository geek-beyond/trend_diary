import { describe, expect, it } from 'vitest'
import { fromDbId, isWithinDbIdRange, toDbId, toDbIds } from './id'

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

describe('isWithinDbIdRange', () => {
  it.each([
    { name: '下限（0n）は範囲内', id: 0n, expected: true },
    { name: '上限（MAX_SAFE_INTEGER）は範囲内', id: MAX_SAFE, expected: true },
    { name: '負数は範囲外', id: -1n, expected: false },
    { name: '上限超過は範囲外', id: MAX_SAFE + 1n, expected: false },
  ])('$name', ({ id, expected }) => {
    expect(isWithinDbIdRange(id)).toBe(expected)
  })
})

describe('toDbId', () => {
  describe('正常系', () => {
    it('範囲内のbigint(123n)をnumber(123)に変換する', () => {
      expect(toDbId(123n)).toBe(123)
    })
  })

  describe('準正常系（境界値）', () => {
    it.each([
      { name: '下限0n → 0', input: 0n, expected: 0 },
      {
        name: '上限MAX_SAFE_INTEGER → 同値のnumber',
        input: MAX_SAFE,
        expected: Number.MAX_SAFE_INTEGER,
      },
    ])('$name に変換する', ({ input, expected }) => {
      expect(toDbId(input)).toBe(expected)
    })
  })

  describe('異常系', () => {
    it.each([
      { name: '負数(-1n)', input: -1n },
      { name: 'MAX_SAFE_INTEGER超過', input: MAX_SAFE + 1n },
    ])('$name はRangeErrorを投げる', ({ input }) => {
      expect(() => toDbId(input)).toThrow(RangeError)
    })
  })
})

describe('toDbIds', () => {
  describe('正常系', () => {
    it('bigint配列[1n,2n,3n]をnumber配列[1,2,3]に変換する', () => {
      expect(toDbIds([1n, 2n, 3n])).toEqual([1, 2, 3])
    })
  })

  describe('準正常系（境界値）', () => {
    it('空配列を空配列に変換する', () => {
      expect(toDbIds([])).toEqual([])
    })
  })

  describe('異常系', () => {
    it('範囲外の値を含む配列[1n,-1n]はRangeErrorを投げる', () => {
      expect(() => toDbIds([1n, -1n])).toThrow(RangeError)
    })
  })
})

describe('fromDbId', () => {
  describe('正常系', () => {
    it.each([
      { name: 'number(123) → bigint(123n)', input: 123, expected: 123n },
      { name: 'bigint(123n) → そのまま返す', input: 123n, expected: 123n },
    ])('$name', ({ input, expected }) => {
      expect(fromDbId(input)).toBe(expected)
    })
  })

  describe('準正常系（境界値）', () => {
    it('下限のnumber(0)をbigint(0n)に変換する', () => {
      expect(fromDbId(0)).toBe(0n)
    })
  })

  describe('異常系', () => {
    it.each([
      { name: '負数のnumber(-1)', input: -1 },
      { name: '安全整数でないnumber(1.5)', input: 1.5 },
      { name: 'MAX_SAFE_INTEGER超過のnumber', input: Number.MAX_SAFE_INTEGER + 1 },
    ])('$name はRangeErrorを投げる', ({ input }) => {
      expect(() => fromDbId(input)).toThrow(RangeError)
    })
  })
})
