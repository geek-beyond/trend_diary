import { ClientError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { err, ok, type Result } from 'neverthrow'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// oxlint-disable-next-line typescript/no-restricted-types -- siteverify の JSON レスポンスを型ガードで絞り込むため入力は unknown を受ける
function isTurnstileVerifyResponse(value: unknown): value is { success: boolean } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'success' in value &&
    typeof value.success === 'boolean'
  )
}

/**
 * Cloudflare TurnstileのトークンをsiteverifyAPIで検証する。
 */
export async function verifyTurnstile(
  secret: string,
  token?: string,
): Promise<Result<void, ClientError | ServerError>> {
  if (!token) return err(new ClientError('captcha token is required', 403))

  const body = new URLSearchParams()
  body.append('secret', secret)
  body.append('response', token)

  const response = await wrapAsyncCall(() => fetch(SITEVERIFY_URL, { method: 'POST', body }))
  if (response.isErr()) return err(new ServerError(response.error))

  const parsed = await wrapAsyncCall(() => response.value.json())
  if (parsed.isErr()) return err(new ServerError(parsed.error))

  if (!isTurnstileVerifyResponse(parsed.value) || !parsed.value.success) {
    return err(new ClientError('captcha verification failed', 403))
  }

  return ok(undefined)
}
