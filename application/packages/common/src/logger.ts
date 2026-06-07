import pino from 'pino'

export type LogLevel = pino.LevelWithSilent
export type LogMessage = string | Record<string, unknown>
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

  private log(level: LogLevel, message: LogMessage, ...args: unknown[]): void {
    const extra = args[0]

    if (typeof message === 'string') {
      if (extra instanceof Error) {
        this.logger[level]({ ...this.context, err: extra }, message)
        return
      }

      if (extra && typeof extra === 'object') {
        this.logger[level]({ ...this.context, ...(extra as Record<string, unknown>) }, message)
        return
      }

      this.logger[level](this.context, message)
      return
    }

    this.logger[level]({ ...this.context, ...message })
  }

  debug(message: LogMessage, ...args: unknown[]): void {
    this.log('debug', message, ...args)
  }

  info(message: LogMessage, ...args: unknown[]): void {
    this.log('info', message, ...args)
  }

  warn(message: LogMessage, ...args: unknown[]): void {
    this.log('warn', message, ...args)
  }

  error(message: LogMessage, error: Error | unknown, ...args: unknown[]): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error))

    // * pinoのstdSerializersで処理されるよう、errプロパティ名を使用
    if (typeof message === 'string') {
      this.logger.error({ ...this.context, err: normalizedError }, message)
      return
    }

    this.logger.error({ ...this.context, ...message, err: normalizedError })
  }
}

export type LoggerType = Logger
