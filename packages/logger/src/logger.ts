import pino from 'pino'

export type LogLevel = pino.LevelWithSilent
// oxlint-disable-next-line typescript/no-restricted-types -- 任意の構造化ログを受け取る基盤型であり、値の型を事前に確定できないため
export type LogMessage = string | Record<string, unknown>
// oxlint-disable-next-line typescript/no-restricted-types -- 任意のキーを持つログコンテキストを受け取る基盤型であり、値の型を事前に確定できないため
export type LogContext = Record<string, unknown>

export default class Logger {
  private readonly logger: pino.Logger

  private readonly level: pino.LevelWithSilent
  private readonly context: LogContext

  constructor(level: LogLevel, context: LogContext = {}) {
    this.level = level
    this.context = context

    this.logger = pino({
      level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: () => `,"time":${Date.now()}`,
      messageKey: 'msg',
      // * pinoでエラーを表示する場合に使用する
      serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
      },
    })
  }

  with(context: LogContext): Logger {
    return new Logger(this.level, { ...this.context, ...context })
  }

  // oxlint-disable-next-line typescript/no-restricted-types -- 任意個・任意型の付加情報を受け取るログ基盤のため、事前に型を確定できないため
  private log(level: LogLevel, message: LogMessage, ...args: unknown[]): void {
    const extra = args[0]

    if (typeof message === 'string') {
      if (extra instanceof Error) {
        this.logger[level]({ ...this.context, err: extra }, message)
        return
      }

      if (extra && typeof extra === 'object') {
        this.logger[level]({ ...this.context, ...extra }, message)
        return
      }

      this.logger[level](this.context, message)
      return
    }

    this.logger[level]({ ...this.context, ...message })
  }

  // oxlint-disable-next-line typescript/no-restricted-types -- 任意個・任意型の付加情報を受け取るログ基盤のため、事前に型を確定できないため
  debug(message: LogMessage, ...args: unknown[]): void {
    this.log('debug', message, ...args)
  }

  // oxlint-disable-next-line typescript/no-restricted-types -- 任意個・任意型の付加情報を受け取るログ基盤のため、事前に型を確定できないため
  info(message: LogMessage, ...args: unknown[]): void {
    this.log('info', message, ...args)
  }

  // oxlint-disable-next-line typescript/no-restricted-types -- 任意個・任意型の付加情報を受け取るログ基盤のため、事前に型を確定できないため
  warn(message: LogMessage, ...args: unknown[]): void {
    this.log('warn', message, ...args)
  }

  error(message: LogMessage, error: Error): void {
    // * pinoのstdSerializersで処理されるよう、errプロパティ名を使用
    if (typeof message === 'string') {
      this.logger.error({ ...this.context, err: error }, message)
      return
    }

    this.logger.error({ ...this.context, ...message, err: error })
  }
}

export type LoggerType = Logger
