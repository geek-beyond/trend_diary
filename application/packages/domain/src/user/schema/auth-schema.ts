import { z } from 'zod'

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

/**
 * 対応するOAuthプロバイダ。追加時はここに増やす
 */
export type OAuthProvider = 'github'

/**
 * OAuth認可の開始結果。ブラウザをこのURLへリダイレクトさせる
 */
export interface OAuthAuthorization {
  url: string
}

/**
 * 認証ユーザーに紐付くログイン手段（email / github など）
 */
export interface LinkedIdentity {
  provider: string
}

// OAuthログイン開始時のクエリ。redirectはログイン成功後に戻す内部パス
export const oauthLoginQuerySchema = z.object({
  redirect: z.string().optional(),
})

export type OAuthLoginQuery = z.infer<typeof oauthLoginQuerySchema>

// OAuthコールバックのクエリ。認可拒否や失敗時はcodeが無くerrorが渡ってくる
export const oauthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export type OAuthCallbackQuery = z.infer<typeof oauthCallbackQuerySchema>

export interface PasskeyChallenge {
  challengeId: string
  // optionsはブラウザのnavigator.credentialsへ渡す値で、型の実体はブラウザWebAuthn API側にあるため解釈しない
  options: unknown
}

// 真正性はSupabaseが検証するため、ここは形だけ受け取り中身は素通しする
export const passkeyVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.record(z.string(), z.unknown()),
})

export type PasskeyVerifyInput = z.infer<typeof passkeyVerifyInputSchema>

export interface PasskeyRegistrationResult {
  id: string
}

// 無効化(全削除)で個々のpasskeyを指定するためidだけを扱う
export interface RegisteredPasskey {
  id: string
}
