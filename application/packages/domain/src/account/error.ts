// アカウント集約のドメインエラー。HTTP ステータス等の責務は持たず、失敗の種別を型で表す。
// HTTP への写像は HTTP 境界(ハンドラ)の責務とする。
export class ActiveUserNotFoundError extends Error {
  name = 'ActiveUserNotFoundError'
}
