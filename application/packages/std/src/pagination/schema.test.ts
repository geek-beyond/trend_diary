import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIMIT,
  DEFAULT_MOBILE_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  MIN_LIMIT,
  offsetPaginationMobileSchema,
  offsetPaginationSchema,
} from './schema'

describe('offsetPaginationSchema', () => {
  const validCases = [
    {
      name: '空入力ならデフォルト値',
      input: {},
      expected: { page: DEFAULT_PAGE, limit: DEFAULT_LIMIT },
    },
    {
      name: '文字列を数値に変換する',
      input: { page: '3', limit: '45' },
      expected: { page: 3, limit: 45 },
    },
  ] as const

  for (const { name, input, expected } of validCases) {
    it(name, () => {
      expect(offsetPaginationSchema.parse(input)).toEqual(expected)
    })
  }

  const invalidCases = [
    {
      name: 'pageが文字列',
      input: { page: 'abc' },
      message: 'Invalid input: expected number, received NaN',
    },
    {
      name: 'limitが文字列',
      input: { limit: 'invalid' },
      message: 'Invalid input: expected number, received NaN',
    },
    { name: 'pageが0', input: { page: 0 }, message: 'Too small: expected number to be >=1' },
    {
      name: 'pageが負の値',
      input: { page: -1 },
      message: 'Too small: expected number to be >=1',
    },
    {
      name: 'pageが大きな負の値',
      input: { page: -999 },
      message: 'Too small: expected number to be >=1',
    },
    { name: 'pageが小数', input: { page: 1.5 }, message: 'Invalid input: expected int' },
    { name: 'pageが1未満の小数', input: { page: 0.9 }, message: 'Invalid input: expected int' },
    {
      name: `limitが${MIN_LIMIT}未満`,
      input: { limit: 0 },
      message: `Too small: expected number to be >=${MIN_LIMIT}`,
    },
    {
      name: 'limitが負の値',
      input: { limit: -10 },
      message: `Too small: expected number to be >=${MIN_LIMIT}`,
    },
    {
      name: `limitが${MAX_LIMIT}より大きい`,
      input: { limit: 101 },
      message: `Too big: expected number to be <=${MAX_LIMIT}`,
    },
    {
      name: 'limitが大きな値',
      input: { limit: 500 },
      message: `Too big: expected number to be <=${MAX_LIMIT}`,
    },
  ]

  for (const { name, input, message } of invalidCases) {
    it(`${name}ならバリデーションエラー`, () => {
      expect(() => offsetPaginationSchema.parse(input)).toThrow(message)
    })
  }
})

describe('offsetPaginationMobileSchema', () => {
  const validCases = [
    {
      name: '空入力ならデフォルト値',
      input: {},
      expected: { page: DEFAULT_PAGE, limit: DEFAULT_MOBILE_LIMIT },
    },
    {
      name: '文字列を数値に変換する',
      input: { page: '3', limit: '15' },
      expected: { page: 3, limit: 15 },
    },
  ] as const

  for (const { name, input, expected } of validCases) {
    it(name, () => {
      expect(offsetPaginationMobileSchema.parse(input)).toEqual(expected)
    })
  }

  const invalidCases = [
    {
      name: 'pageが文字列',
      input: { page: 'abc' },
      message: 'Invalid input: expected number, received NaN',
    },
    {
      name: 'limitが文字列',
      input: { limit: 'invalid' },
      message: 'Invalid input: expected number, received NaN',
    },
    { name: 'pageが0', input: { page: 0 }, message: 'Too small: expected number to be >=1' },
    {
      name: 'pageが負の値',
      input: { page: -1 },
      message: 'Too small: expected number to be >=1',
    },
    { name: 'pageが小数', input: { page: 1.5 }, message: 'Invalid input: expected int' },
    {
      name: `limitが${MIN_LIMIT}未満`,
      input: { limit: 0 },
      message: `Too small: expected number to be >=${MIN_LIMIT}`,
    },
    {
      name: 'limitが負の値',
      input: { limit: -10 },
      message: `Too small: expected number to be >=${MIN_LIMIT}`,
    },
    {
      name: `limitが${MAX_LIMIT}より大きい`,
      input: { limit: 101 },
      message: `Too big: expected number to be <=${MAX_LIMIT}`,
    },
    {
      name: 'limitが大きな値',
      input: { limit: 500 },
      message: `Too big: expected number to be <=${MAX_LIMIT}`,
    },
  ]

  for (const { name, input, message } of invalidCases) {
    it(`${name}ならバリデーションエラー`, () => {
      expect(() => offsetPaginationMobileSchema.parse(input)).toThrow(message)
    })
  }
})
