import { describe, expect, it } from 'vitest'

import { createdAt, updatedAt } from './schemas'

type TestCase = {
  name: string
  input: unknown
  expected: boolean
}

const cases: TestCase[] = [
  {
    name: '有効な日付',
    input: new Date('2024-01-01T00:00:00.000Z'),
    expected: true,
  },
  {
    name: '無効な日付（文字列）',
    input: '2024-01-01',
    expected: false,
  },
  {
    name: '無効な日付（数値）',
    input: 1717171717,
    expected: false,
  },
  {
    name: '無効な日付（null）',
    input: null,
    expected: false,
  },
  {
    name: '無効な日付（undefined）',
    input: undefined,
    expected: false,
  },
]

describe('createdAt schema', () => {
  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      const result = createdAt.safeParse(input)
      expect(result.success).toBe(expected)
    })
  })
})

describe('updatedAt schema', () => {
  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      const result = updatedAt.safeParse(input)
      expect(result.success).toBe(expected)
    })
  })
})
