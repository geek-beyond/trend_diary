type Success<T> = { data: T; error?: never }
type Failure<E> = { data?: never; error: E }

export type Result<T, E> = Success<T> | Failure<E>
export type AsyncResult<T, E> = Promise<Result<T, E>>

export const success = <T>(data: T): Result<T, never> => ({ data })

export const failure = <E>(error: E): Result<never, E> => ({ error })

export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> =>
  result.error === undefined

export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> =>
  result.error !== undefined

export const wrapAsyncCall = async <T>(
  fn: () => Promise<T>,
  cleanup?: () => unknown | Promise<unknown>,
): AsyncResult<T, Error> => {
  try {
    return success(await fn())
  } catch (e) {
    return failure(e instanceof Error ? e : new Error(String(e)))
  } finally {
    if (cleanup) await cleanup()
  }
}
