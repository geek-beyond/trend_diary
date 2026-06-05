// Drizzle はドライバ例外を DrizzleQueryError でラップし元例外を cause に格納する。
// ラッパのメッセージは `Failed query: ...` で元のDBエラー文言が失われるため、cause を取り出す。
export default function unwrapDbError(error: Error): Error {
  return error.cause instanceof Error ? error.cause : error
}
