import ClientError from './client-error'

export default class UnauthorizedError extends ClientError {
  constructor(
    message: string,
    readonly context?: {
      userId?: number
      sessionExists?: boolean
    },
  ) {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}
