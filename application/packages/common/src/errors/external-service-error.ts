import ServerError from './server-error'

/**
 * 外部サービスエラー
 * 外部サービス（Supabase Auth等）との連携で問題が発生した場合に使用
 */
export default class ExternalServiceError extends ServerError {
  public readonly originalError: ServerError
  public readonly serviceError: ServerError
  public readonly context: Record<string, unknown>

  constructor(
    message: string,
    originalError: ServerError,
    serviceError: ServerError,
    context: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ExternalServiceError'
    this.originalError = originalError
    this.serviceError = serviceError
    this.context = context
  }
}
