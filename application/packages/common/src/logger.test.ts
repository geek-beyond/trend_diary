import { describe, expect, it, vi } from 'vitest'
import Logger from './logger'
import { StdTestHelper } from './test-helper/std'

const parseLogObjects = (lines: string[]) =>
  lines
    .flatMap((line) => line.split('\n'))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))

describe('Logger', () => {
  it('指定したレベルでpinoを初期化できる', () => {
    const cases = [
      { level: 'silent' as const },
      { level: 'debug' as const },
      { level: 'info' as const },
    ] as const

    for (const { level } of cases) {
      const logger = new Logger(level)
      const scoped = logger.with({})
      const internal = scoped as unknown as { logger: { level: string } }
      expect(internal.logger.level).toBe(level)
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
})
