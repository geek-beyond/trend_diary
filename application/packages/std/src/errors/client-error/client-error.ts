export default class ClientError extends Error {
  public readonly statusCode: number = 400

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'ClientError'
    if (statusCode) this.statusCode = statusCode
  }
}
