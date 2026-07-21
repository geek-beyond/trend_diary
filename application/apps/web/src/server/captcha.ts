import { wrapAsyncCall } from '@trend-diary/std/result'
import { HTTPException } from 'hono/http-exception'
import { err, ok, type Result } from 'neverthrow'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// oxlint-disable-next-line typescript/no-restricted-types -- siteverify の JSON レスポンス(未検証)から success を判定するため入力は unknown を受ける
function isSuccessResponse(value: unknown): boolean {
  return value !== null && typeof value === 'object' && 'success' in value && value.success === true
}

/**
 * Cloudflare TurnstileのトークンをsiteverifyAPIで検証し、検証の成否を返す。
 * 通信・解析の失敗のみ err を返す（トークン不備・検証失敗は ok(false)）。
 */
export async function verifyTurnstile(
  secret: string,
  token?: string,
): Promise<Result<boolean, Error>> {
  if (!token) return ok(false)

  const body = new URLSearchParams()
  body.append('secret', secret)
  body.append('response', token)

  const response = await wrapAsyncCall(() => fetch(SITEVERIFY_URL, { method: 'POST', body }))
  if (response.isErr()) return err(response.error)

  const parsed = await wrapAsyncCall(() => response.value.json())
  if (parsed.isErr()) return err(parsed.error)

  return ok(isSuccessResponse(parsed.value))
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
  // 通信・解析の失敗はサーバ起因として errorHandler の 5xx 処理に委ねる
  if (result.isErr()) throw result.error
  // 検証失敗(トークン不備・不正)はクライアント起因のため 403 を返す
  if (!result.value) throw new HTTPException(403, { message: 'captcha verification failed' })
}
