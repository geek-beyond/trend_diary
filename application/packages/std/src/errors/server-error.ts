export default class ServerError extends Error {
  public readonly statusCode: number = 500

  // oxlint-disable-next-line typescript/no-restricted-types -- throwされた任意の値をラップするため、入力は事前に型を確定できないため
  constructor(error: unknown, statusCode?: number) {
    super(error instanceof Error ? error.message : String(error))
    this.name = 'ServerError'
    if (statusCode) this.statusCode = statusCode
  }
}
