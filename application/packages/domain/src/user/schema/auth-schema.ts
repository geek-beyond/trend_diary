import { z } from 'zod'
import type { WebAuthnCredential } from './webauthn-schema'

// 認証プロバイダに依存しない入力検証。クライアントのフォームとサーバのバリデーションで共有するため domain に置く
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

// 真正性はSupabaseが検証するため中身の妥当性検証はプロバイダに委ね、ここは WebAuthn ceremony 結果を素通しする。型は中立な WebAuthn 資格情報で固定する
export const passkeyVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.custom<WebAuthnCredential>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
})

export type PasskeyVerifyInput = z.infer<typeof passkeyVerifyInputSchema>
