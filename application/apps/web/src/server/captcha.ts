import { wrapAsyncCall } from '@trend-diary/std/result'
import { HTTPException } from 'hono/http-exception'
import { err, ok, type Result } from 'neverthrow'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// CAPTCHA 検証の業務エラー(トークン不備・検証失敗)を表す。HTTP は知らず、HTTP への写像は境界の責務とする。
export class CaptchaVerificationError extends Error {
  name = 'CaptchaVerificationError'
}

// oxlint-disable-next-line typescript/no-restricted-types -- siteverify の JSON レスポンス(未検証)から success を判定するため入力は unknown を受ける
function isSuccessResponse(value: unknown): boolean {
  return value !== null && typeof value === 'object' && 'success' in value && value.success === true
}

/**
 * Cloudflare TurnstileのトークンをsiteverifyAPIで検証する。
 * 検証失敗は CaptchaVerificationError、通信・解析の失敗は素の Error を返す。
 */
export async function verifyTurnstile(
  secret: string,
  token?: string,
): Promise<Result<void, Error>> {
  if (!token) return err(new CaptchaVerificationError('captcha token is required'))

  const body = new URLSearchParams()
  body.append('secret', secret)
  body.append('response', token)

  const response = await wrapAsyncCall(() => fetch(SITEVERIFY_URL, { method: 'POST', body }))
  if (response.isErr()) return err(response.error)

  const parsed = await wrapAsyncCall(() => response.value.json())
  if (parsed.isErr()) return err(parsed.error)

  if (!isSuccessResponse(parsed.value)) {
    return err(new CaptchaVerificationError('captcha verification failed'))
  }

  return ok(undefined)
}

/**
 * CAPTCHAを検証し、失敗時は HTTPException を送出する。
 * secret未設定の環境ではCAPTCHAを無効とみなす。
 */
export async function assertCaptchaVerified(
  secret: string | undefined,
  token: string | undefined,
): Promise<void> {
  if (!secret) return

  const result = await verifyTurnstile(secret, token)
  if (result.isErr()) {
    // 検証失敗はクライアント起因(403)、それ以外(通信・解析の失敗)はサーバ起因として errorHandler の 5xx 処理に委ねる
    if (result.error instanceof CaptchaVerificationError) {
      throw new HTTPException(403, { message: result.error.message })
    }
    throw result.error
  }
}
