import { describe, expect, it } from 'vitest'
import { fromDbId, toDbId, toDbIds } from './id'

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

describe('toDbId', () => {
  it('範囲内のbigintをnumberに変換すること', () => {
    expect(toDbId(123n)).toBe(123)
  })

  it('下限値0nを変換できること', () => {
    expect(toDbId(0n)).toBe(0)
  })

  it('上限値Number.MAX_SAFE_INTEGERを変換できること', () => {
    expect(toDbId(MAX_SAFE)).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('負数の場合はRangeErrorを投げること', () => {
    expect(() => toDbId(-1n)).toThrow(RangeError)
  })

  it('Number.MAX_SAFE_INTEGERを超える場合はRangeErrorを投げること', () => {
    expect(() => toDbId(MAX_SAFE + 1n)).toThrow(RangeError)
  })
})

describe('toDbIds', () => {
  it('bigint配列をnumber配列に変換すること', () => {
    expect(toDbIds([1n, 2n, 3n])).toEqual([1, 2, 3])
  })

  it('空配列を空配列に変換すること', () => {
    expect(toDbIds([])).toEqual([])
  })

  it('範囲外の値を含む場合はRangeErrorを投げること', () => {
    expect(() => toDbIds([1n, -1n])).toThrow(RangeError)
  })
})

describe('fromDbId', () => {
  it('numberをbigintに変換すること', () => {
    expect(fromDbId(123)).toBe(123n)
  })

  it('0を変換できること', () => {
    expect(fromDbId(0)).toBe(0n)
  })

  it('bigintはそのまま返すこと', () => {
    expect(fromDbId(123n)).toBe(123n)
  })

  it('負数のnumberの場合はRangeErrorを投げること', () => {
    expect(() => fromDbId(-1)).toThrow(RangeError)
  })

  it('安全整数でないnumber(小数)の場合はRangeErrorを投げること', () => {
    expect(() => fromDbId(1.5)).toThrow(RangeError)
  })

  it('Number.MAX_SAFE_INTEGERを超えるnumberの場合はRangeErrorを投げること', () => {
    expect(() => fromDbId(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError)
  })
})
