import { describe, expect, it } from 'vitest'
import { fromDbId, toDbId, toDbIds } from './id'

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

describe('toDbId', () => {
  it.each([
    { label: '通常値', input: 123n, expected: 123 },
    { label: '下限値0n', input: 0n, expected: 0 },
    { label: '上限値Number.MAX_SAFE_INTEGER', input: MAX_SAFE, expected: Number.MAX_SAFE_INTEGER },
  ])('$labelをnumberに変換すること', ({ input, expected }) => {
    expect(toDbId(input)).toBe(expected)
  })

  it.each([
    { label: '負数', input: -1n },
    { label: 'Number.MAX_SAFE_INTEGERを超える値', input: MAX_SAFE + 1n },
  ])('$labelの場合はRangeErrorを投げること', ({ input }) => {
    expect(() => toDbId(input)).toThrow(RangeError)
  })
})

describe('toDbIds', () => {
  it.each([
    { label: 'bigint配列', input: [1n, 2n, 3n], expected: [1, 2, 3] },
    { label: '空配列', input: [], expected: [] },
  ])('$labelをnumber配列に変換すること', ({ input, expected }) => {
    expect(toDbIds(input)).toEqual(expected)
  })

  it('範囲外の値を含む場合はRangeErrorを投げること', () => {
    expect(() => toDbIds([1n, -1n])).toThrow(RangeError)
  })
})

describe('fromDbId', () => {
  it.each([
    { label: 'number', input: 123, expected: 123n },
    { label: '下限値0', input: 0, expected: 0n },
    { label: 'bigint(そのまま返す)', input: 123n, expected: 123n },
  ])('$labelをbigintに変換すること', ({ input, expected }) => {
    expect(fromDbId(input)).toBe(expected)
  })

  it.each([
    { label: '負数のnumber', input: -1 },
    { label: '安全整数でないnumber(小数)', input: 1.5 },
    { label: 'Number.MAX_SAFE_INTEGERを超えるnumber', input: Number.MAX_SAFE_INTEGER + 1 },
  ])('$labelの場合はRangeErrorを投げること', ({ input }) => {
    expect(() => fromDbId(input)).toThrow(RangeError)
  })
})
