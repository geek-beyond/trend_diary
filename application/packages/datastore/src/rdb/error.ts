import { wrapAsyncCall } from '@trend-diary/std/result'
import type { Result } from 'neverthrow'

// Drizzle はドライバ例外を DrizzleQueryError でラップし元例外を cause に格納する。
// ラッパのメッセージは `Failed query: ...` で元のDBエラー文言が失われるため、cause を取り出す。
function unwrapDbError(error: Error): Error {
  return error.cause instanceof Error ? error.cause : error
}

export function wrapDbCall<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  return wrapAsyncCall(fn).then((result) => result.mapErr(unwrapDbError))
}
