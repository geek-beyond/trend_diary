/**
 * Drizzle はドライバ由来の例外を `DrizzleQueryError` でラップし、
 * 元の例外を `cause` に格納する。`DrizzleQueryError` 自身のメッセージは
 * `Failed query: ...` 形式となり元のDBエラーメッセージが失われるため、
 * `cause` が Error の場合はそれを取り出して返す。
 *
 * 主に各ドメインの infrastructure 層で、`wrapAsyncCall` が捕捉した
 * Drizzle のクエリ例外を `ServerError` に包む直前に呼び出し、
 * 元のドライバ情報（一意制約違反メッセージ等）をエラーメッセージへ伝播させる用途で使う。
 *
 * @param error `wrapAsyncCall` 等が捕捉した例外（多くは `DrizzleQueryError`）
 * @returns `cause` が Error ならその元例外、そうでなければ受け取った例外そのもの
 */
export default function unwrapDbError(error: Error): Error {
  return error.cause instanceof Error ? error.cause : error
}
