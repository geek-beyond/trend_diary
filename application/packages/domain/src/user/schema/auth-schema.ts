import { z } from 'zod'
import type {
  WebAuthnAuthenticationOptions,
  WebAuthnCredential,
  WebAuthnRegistrationOptions,
} from './webauthn-schema'

export const authInputSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上必要です')
    .max(72, 'パスワードは72文字以下にしてください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      'パスワードは英大文字・小文字・数字・記号(@$!%*?&)を含める必要があります',
    ),
  // captcha未導入の環境や検証不要な経路でも受け付けられるよう任意項目とする
  captchaToken: z.string().optional(),
})

export type AuthInput = z.infer<typeof authInputSchema>

/**
 * 認証ユーザーモデル
 */
export interface AuthenticationUser {
  id: string
  email: string
  emailConfirmedAt?: Date | null
  createdAt: Date
}

/**
 * JWTのローカル検証で得られる検証済みセッション
 * NOTE: 毎リクエストのSupabase往復を避けるため、認証ゲートでは認証IDのみを扱う
 */
export interface VerifiedSession {
  authenticationId: string
}

/**
 * 認証セッションモデル
 */
export interface AuthenticationSession {
  accessToken: string
  refreshToken: string
  expiresIn: number
  expiresAt?: number
  user: AuthenticationUser
}

// options は WebAuthn の資格情報生成／リクエストオプション。認証プロバイダに依存しない中立な JSON 型で保持する
export interface PasskeyRegistrationChallenge {
  challengeId: string
  options: WebAuthnRegistrationOptions
}

export interface PasskeyAuthenticationChallenge {
  challengeId: string
  options: WebAuthnAuthenticationOptions
}

// 真正性はSupabaseが検証するため中身の妥当性検証はプロバイダに委ね、ここは WebAuthn ceremony 結果を素通しする。型は中立な WebAuthn 資格情報で固定する
export const passkeyVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.custom<WebAuthnCredential>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
})

export type PasskeyVerifyInput = z.infer<typeof passkeyVerifyInputSchema>

export interface PasskeyRegistrationResult {
  id: string
}

// 無効化(全削除)で個々のpasskeyを指定するためidだけを扱う
export interface RegisteredPasskey {
  id: string
}
