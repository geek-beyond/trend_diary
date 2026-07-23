import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isLogLevel, queryLogger, resolveLogLevel } from './logger'

describe('isLogLevel', () => {
  it.each([
    { name: 'trace を許容する', input: 'trace', expected: true },
    { name: 'debug を許容する', input: 'debug', expected: true },
    { name: 'info を許容する', input: 'info', expected: true },
    { name: 'warn を許容する', input: 'warn', expected: true },
    { name: 'error を許容する', input: 'error', expected: true },
    { name: 'fatal を許容する', input: 'fatal', expected: true },
    { name: 'silent を許容する', input: 'silent', expected: true },
    { name: '未定義のレベルは弾く', input: 'verbose', expected: false },
    { name: '大文字は弾く', input: 'INFO', expected: false },
    { name: '空文字は弾く', input: '', expected: false },
    { name: 'undefined は弾く', input: undefined, expected: false },
  ])('$name', ({ input, expected }) => {
    expect(isLogLevel(input)).toBe(expected)
  })
})

describe('resolveLogLevel', () => {
  const originalLogLevel = process.env.LOG_LEVEL

  beforeEach(() => {
    delete process.env.LOG_LEVEL
  })

  afterEach(() => {
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL
    } else {
      process.env.LOG_LEVEL = originalLogLevel
    }
  })

  it.each([
    { name: 'LOG_LEVEL 未設定なら既定の info を返す', input: undefined, expected: 'info' },
    {
      name: '不正な LOG_LEVEL は既定の info にフォールバックする',
      input: 'verbose',
      expected: 'info',
    },
    { name: '妥当な LOG_LEVEL はそのまま返す', input: 'debug', expected: 'debug' },
    { name: '前後の空白を無視して解決する', input: '  warn  ', expected: 'warn' },
  ])('$name', ({ input, expected }) => {
    if (input !== undefined) {
      process.env.LOG_LEVEL = input
    }
    expect(resolveLogLevel()).toBe(expected)
  })
})

describe('queryLogger', () => {
  it('logQuery は例外を投げずに完了する', () => {
    expect(() =>
      queryLogger.logQuery('SELECT * FROM users WHERE email = ?', ['user@example.com']),
    ).not.toThrow()
  })
})
