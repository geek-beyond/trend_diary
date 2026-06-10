import { ClientError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { err, ok, type Result } from 'neverthrow'
import type { CaptchaVerifier } from '../repository'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

function isSuccessResponse(value: unknown): boolean {
  return value !== null && typeof value === 'object' && 'success' in value && value.success === true
}

/**
 * Cloudflare TurnstileのトークンをsiteverifyAPIで検証する。
 * secret未設定の環境ではCAPTCHA無効とみなし検証をスキップして許可する。
 */
export class TurnstileCaptchaVerifier implements CaptchaVerifier {
  constructor(private readonly secret?: string) {}

  async verify(token?: string): Promise<Result<void, ClientError | ServerError>> {
    if (!this.secret) return ok(undefined)
    if (!token) return err(new ClientError('captcha token is required', 403))

    const body = new URLSearchParams()
    body.append('secret', this.secret)
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
}
