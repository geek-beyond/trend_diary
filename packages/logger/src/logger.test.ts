import { describe, expect, it, vi } from 'vitest'
import Logger from './logger'
import { StdTestHelper } from './test-helper/std'

const parseLogObjects = (lines: string[]) =>
  lines
    .flatMap((line) => line.split('\n'))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))

// oxlint-disable-next-line typescript/no-restricted-types -- 未知の値を受け取り内部構造を絞り込む型ガードのため、入力はunknown以外に書けないため
const hasInternalLoggerLevel = (value: unknown): value is { logger: { level: string } } => {
  if (typeof value !== 'object' || value === null || !('logger' in value)) return false
  const { logger } = value
  return (
    typeof logger === 'object' &&
    logger !== null &&
    'level' in logger &&
    typeof logger.level === 'string'
  )
}

describe('Logger', () => {
  it('指定したレベルでpinoを初期化できる', () => {
    const cases = [
      { level: 'silent' as const },
      { level: 'debug' as const },
      { level: 'info' as const },
    ] as const

    for (const { level } of cases) {
      const logger = new Logger(level)
      // oxlint-disable-next-line typescript/no-restricted-types -- 型ガードで内部構造を検証するため、Loggerを意図的に未確定型として扱う必要があるため
      const scoped: unknown = logger.with({})
      expect(hasInternalLoggerLevel(scoped)).toBe(true)
      if (hasInternalLoggerLevel(scoped)) {
        expect(scoped.logger.level).toBe(level)
      }
    }
  })

  it('withでコンテキストを合成する', async () => {
    const logger = new Logger('debug')
    const { logs, restore } = StdTestHelper.captureStdout(vi)

    const root = logger.with({})
    const parent = root.with({ traceId: 'base' })
    parent.with({ requestId: 'child' }).info('child-msg')
    parent.info('parent-msg')

    restore()

    const entries = parseLogObjects(logs)
    expect(entries[0]).toMatchObject({ traceId: 'base', requestId: 'child', msg: 'child-msg' })
    expect(entries[1]).toMatchObject({ traceId: 'base', msg: 'parent-msg' })
  })

  it('文字列メッセージでもコンテキストが出力される', async () => {
    const logger = new Logger('debug')
    const { logs, restore } = StdTestHelper.captureStdout(vi)

    logger.with({ requestId: 'abc' }).info('hello world')

    restore()

    const [entry] = parseLogObjects(logs)
    expect(entry).toMatchObject({ requestId: 'abc', msg: 'hello world', level: 'info' })
  })

  it('オブジェクトメッセージはコンテキストとマージされる', async () => {
    const logger = new Logger('debug')
    const { logs, restore } = StdTestHelper.captureStdout(vi)

    logger.with({ requestId: 'abc' }).info({ message: 'hello', foo: 'bar' })

    restore()

    const [entry] = parseLogObjects(logs)
    expect(entry).toMatchObject({ requestId: 'abc', message: 'hello', foo: 'bar' })
  })

  it('debugで文字列メッセージにError引数を渡すとerrに整形される', async () => {
    const logger = new Logger('debug')
    const { logs, restore } = StdTestHelper.captureStdout(vi)

    logger.with({ requestId: 'abc' }).debug('boom happened', new Error('boom'))

    restore()

    const [entry] = parseLogObjects(logs)
    expect(entry).toMatchObject({
      requestId: 'abc',
      msg: 'boom happened',
      level: 'debug',
      err: expect.objectContaining({ type: 'Error', message: 'boom' }),
    })
  })

  it('warnで文字列メッセージに付加オブジェクトをマージする', async () => {
    const logger = new Logger('debug')
    const { logs, restore } = StdTestHelper.captureStdout(vi)

    logger.with({ requestId: 'abc' }).warn('processed', { count: 3 })

    restore()

    const [entry] = parseLogObjects(logs)
    expect(entry).toMatchObject({ requestId: 'abc', msg: 'processed', level: 'warn', count: 3 })
  })

  it('errorはerrプロパティに整形された例外を含める', async () => {
    const logger = new Logger('debug')
    const { logs, restore } = StdTestHelper.captureStdout(vi)
    const scoped = logger.with({ requestId: 'abc' })
    const error = new Error('boom')

    scoped.error('failed', error)

    restore()

    const [entry] = parseLogObjects(logs)
    expect(entry).toMatchObject({
      requestId: 'abc',
      msg: 'failed',
      level: 'error',
      err: expect.objectContaining({ type: 'Error', message: 'boom' }),
    })
  })

  it('errorはオブジェクトメッセージにもerrをマージする', async () => {
    const { logs, restore } = StdTestHelper.captureStdout(vi)
    const logger = new Logger('debug')

    logger.error({ event: 'failure' }, new Error('boom'))

    restore()

    const [entry] = parseLogObjects(logs)
    expect(entry).toMatchObject({
      event: 'failure',
      level: 'error',
      err: expect.objectContaining({ type: 'Error', message: 'boom' }),
    })
  })
})
