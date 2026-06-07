import { z } from 'zod'

export const authInputSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上必要です')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      'パスワードは英大文字・小文字・数字・記号(@$!%*?&)を含める必要があります',
    ),
})

export type AuthInput = z.infer<typeof authInputSchema>

/**
 * 認証ユーザーモデル
 */
export type AuthenticationUser = {
  id: string
  email: string
  emailConfirmedAt?: Date | null
  createdAt: Date
}

/**
 * 認証セッションモデル
 */
export type AuthenticationSession = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  expiresAt?: number
  user: AuthenticationUser
}
