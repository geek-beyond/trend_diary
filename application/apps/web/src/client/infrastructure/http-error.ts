// クライアントが HTTP レスポンスの失敗を表すエラー。API 境界でのみ用い、ステータスコードを保持する。
export default class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
