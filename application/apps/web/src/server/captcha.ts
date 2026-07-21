import { ClientError, ServerError } from '@trend-diary/std/errors'
import { wrapAsyncCall } from '@trend-diary/std/result'
import { err, ok, type Result } from 'neverthrow'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// oxlint-disable-next-line typescript/no-restricted-types -- siteverify の JSON レスポンス(未検証)から success を判定するため入力は unknown を受ける
function isSuccessResponse(value: unknown): boolean {
  return value !== null && typeof value === 'object' && 'success' in value && value.success === true
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

  if (!isSuccessResponse(parsed.value)) {
    return err(new ClientError('captcha verification failed', 403))
  }

  return ok(undefined)
}

/**
 * CAPTCHAを検証し、失敗時は検証エラー(ClientError/ServerError)を送出する。
 * secret未設定の環境ではCAPTCHAを無効とみなす。
 */
export async function assertCaptchaVerified(
  secret: string | undefined,
  token: string | undefined,
): Promise<void> {
  if (!secret) return

  const result = await verifyTurnstile(secret, token)
  if (result.isErr()) throw result.error
}
