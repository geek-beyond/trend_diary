import AppLogger from '@trend-diary/common/logger'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryLogger, resolveLogLevel } from './logger'

describe('resolveLogLevel', () => {
  const original = process.env.LOG_LEVEL

  afterEach(() => {
    if (original === undefined) {
      delete process.env.LOG_LEVEL
    } else {
      process.env.LOG_LEVEL = original
    }
  })

  it('LOG_LEVEL未設定の場合はinfoを返すこと', () => {
    delete process.env.LOG_LEVEL

    expect(resolveLogLevel()).toBe('info')
  })

  it.each([
    { logLevel: 'debug', expected: 'debug' },
    { logLevel: '  debug  ', expected: 'debug' },
    { logLevel: 'verbose', expected: 'info' },
  ])('LOG_LEVELが"$logLevel"の場合は$expectedを返すこと', ({ logLevel, expected }) => {
    process.env.LOG_LEVEL = logLevel

    expect(resolveLogLevel()).toBe(expected)
  })
})

describe('queryLogger.logQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('query/paramsを"drizzle query"としてdebugで出力すること', () => {
    const debugSpy = vi.spyOn(AppLogger.prototype, 'debug').mockImplementation(() => undefined)

    queryLogger.logQuery('select * from users where email = ?', ['user@example.com'])

    expect(debugSpy).toHaveBeenCalledWith({
      msg: 'drizzle query',
      query: 'select * from users where email = ?',
      params: ['user@example.com'],
    })
  })
})
