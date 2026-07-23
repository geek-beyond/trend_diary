import { z } from 'zod'

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
