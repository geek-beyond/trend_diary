export default class ServerError extends Error {
  public readonly statusCode: number = 500

  constructor(error: unknown, statusCode?: number) {
    super(error instanceof Error ? error.message : String(error))
    this.name = 'ServerError'
    if (statusCode) this.statusCode = statusCode
  }
}
