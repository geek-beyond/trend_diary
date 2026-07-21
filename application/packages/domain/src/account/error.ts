// アカウント集約のドメインエラー。HTTP ステータス等の責務は持たず、失敗の種別を型で表す。
// HTTP への写像は HTTP 境界(ハンドラ)の責務とする。
abstract class AccountError extends Error {}

export class ActiveUserNotFoundError extends AccountError {
  name = 'ActiveUserNotFoundError'
}

// 永続化層(DB 等)の失敗。想定内の外部 I/O 失敗として Result に載せて呼び出し元へ返す。
export class AccountRepositoryError extends AccountError {
  name = 'AccountRepositoryError'

  // oxlint-disable-next-line typescript/no-restricted-types -- 発生元の任意の失敗値を cause として保持するため
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
  }
}
