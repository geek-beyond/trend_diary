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
