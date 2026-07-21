// 記事集約のドメインエラー。HTTP ステータス等の責務は持たず、失敗の種別を型で表す。
// HTTP への写像は HTTP 境界(ハンドラ)の責務とする。
// 各メソッドの Result は実際に返す具象型で表すため、基底型は集約内の共通土台に留め公開しない。
abstract class ArticleError extends Error {}

export class ArticleNotFoundError extends ArticleError {
  name = 'ArticleNotFoundError'
}

// 永続化層(DB 等)の失敗。想定内の外部 I/O 失敗として Result に載せて呼び出し元へ返す。
export class ArticleRepositoryError extends ArticleError {
  name = 'ArticleRepositoryError'

  // oxlint-disable-next-line typescript/no-restricted-types -- 発生元の任意の失敗値を cause として保持するため
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
  }
}
