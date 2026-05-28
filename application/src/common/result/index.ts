import { type Err, err, type Result as NeverthrowResult, type Ok, ok } from 'neverthrow'

export type { Err, Ok }
export type Result<T, E> = NeverthrowResult<T, E>
export type AsyncResult<T, E> = Promise<Result<T, E>>

export const success = ok

export const failure = err

export const isSuccess = <T, E>(result: Result<T, E>): result is Ok<T, E> => result.isOk()

export const isFailure = <T, E>(result: Result<T, E>): result is Err<T, E> => result.isErr()

export const wrapAsyncCall = async <T>(
  fn: () => Promise<T>,
  cleanup?: () => unknown | Promise<unknown>,
): AsyncResult<T, Error> => {
  try {
    return ok(await fn())
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)))
  } finally {
    if (cleanup) await cleanup()
  }
}
