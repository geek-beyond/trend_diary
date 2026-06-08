import AppLogger from '@trend-diary/common/logger'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryLogger } from './logger'

describe('queryLogger.logQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('正常系', () => {
    it('query/paramsを"drizzle query"としてdebugで出力する', () => {
      const debugSpy = vi.spyOn(AppLogger.prototype, 'debug').mockImplementation(() => undefined)

      queryLogger.logQuery('select * from users where email = ?', ['user@example.com'])

      expect(debugSpy).toHaveBeenCalledWith({
        msg: 'drizzle query',
        query: 'select * from users where email = ?',
        params: ['user@example.com'],
      })
    })
  })
})
