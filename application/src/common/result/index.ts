import { err, ok, type Result } from 'neverthrow'

export const wrapAsyncCall = async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> => {
  try {
    return ok(await fn())
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}
