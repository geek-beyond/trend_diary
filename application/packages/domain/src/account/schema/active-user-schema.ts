import { createdAt, updatedAt } from '@trend-diary/std/schemas'
import { z } from 'zod'

export const activeUserSchema = z.object({
  activeUserId: z.bigint().positive(),
  userId: z.bigint().positive(),
  email: z.string().email().max(320), // RFC 5322の最大長
  displayName: z.string().max(64).optional().nullable(), // オプションで最大長64文字
  // Supabase AuthenticationユーザーID。DB では NOT NULL のため必須で表明する
  authenticationId: z.string().uuid(),
  createdAt,
  updatedAt,
})

export const activeUserInputSchema = activeUserSchema.pick({
  email: true,
  displayName: true,
})

export const activeUserUpdateSchema = activeUserSchema.pick({
  displayName: true,
})

export type ActiveUser = z.infer<typeof activeUserSchema>
export type CurrentUser = ActiveUser
export type ActiveUserInput = z.infer<typeof activeUserInputSchema>
