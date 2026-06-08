import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// AppLogger(pino)をモックし、生成時のログレベルと debug 呼び出しを記録する
const constructorMock = vi.hoisted(() => vi.fn())
const debugMock = vi.hoisted(() => vi.fn())

vi.mock('@trend-diary/common/logger', () => ({
  default: class MockLogger {
    constructor(level: unknown, context: unknown) {
      constructorMock(level, context)
    }

    debug(message: unknown) {
      debugMock(message)
    }
  },
}))

// logger.ts はモジュールスコープで AppLogger をシングルトンとしてキャッシュし、
// resolveLogLevel が process.env.LOG_LEVEL を参照するため、ケースごとに再評価させる
async function loadQueryLogger(logLevel: string | undefined) {
  vi.resetModules()
  if (logLevel === undefined) {
    delete process.env.LOG_LEVEL
  } else {
    process.env.LOG_LEVEL = logLevel
  }
  const mod = await import('./logger')
  return mod.queryLogger
}

const originalLogLevel = process.env.LOG_LEVEL

beforeEach(() => {
  constructorMock.mockClear()
  debugMock.mockClear()
})

afterEach(() => {
  if (originalLogLevel === undefined) {
    delete process.env.LOG_LEVEL
  } else {
    process.env.LOG_LEVEL = originalLogLevel
  }
})

describe('queryLogger.logQuery', () => {
  it('query/paramsをdebugレベルで出力すること', async () => {
    const queryLogger = await loadQueryLogger('debug')

    queryLogger.logQuery('select * from users where email = ?', ['user@example.com'])

    expect(debugMock).toHaveBeenCalledTimes(1)
    expect(debugMock).toHaveBeenCalledWith({
      msg: 'drizzle query',
      query: 'select * from users where email = ?',
      params: ['user@example.com'],
    })
  })

  it('AppLoggerは初回呼び出しのみ生成され、以降は再利用されること', async () => {
    const queryLogger = await loadQueryLogger('debug')

    queryLogger.logQuery('select 1', [])
    queryLogger.logQuery('select 2', [])

    expect(constructorMock).toHaveBeenCalledTimes(1)
  })
})

describe('resolveLogLevel (AppLogger生成レベル)', () => {
  it('LOG_LEVEL未設定の場合はinfoで生成すること(PIIを含むdebugログを既定で抑止)', async () => {
    const queryLogger = await loadQueryLogger(undefined)

    queryLogger.logQuery('select 1', [])

    expect(constructorMock).toHaveBeenCalledWith('info', { component: 'drizzle' })
  })

  it('LOG_LEVEL=debugの場合はdebugで生成すること', async () => {
    const queryLogger = await loadQueryLogger('debug')

    queryLogger.logQuery('select 1', [])

    expect(constructorMock).toHaveBeenCalledWith('debug', { component: 'drizzle' })
  })

  it('LOG_LEVELが前後に空白を含む場合はトリムして解釈すること', async () => {
    const queryLogger = await loadQueryLogger('  debug  ')

    queryLogger.logQuery('select 1', [])

    expect(constructorMock).toHaveBeenCalledWith('debug', { component: 'drizzle' })
  })

  it('不正なLOG_LEVELの場合はinfoにフォールバックすること', async () => {
    const queryLogger = await loadQueryLogger('verbose')

    queryLogger.logQuery('select 1', [])

    expect(constructorMock).toHaveBeenCalledWith('info', { component: 'drizzle' })
  })
})
