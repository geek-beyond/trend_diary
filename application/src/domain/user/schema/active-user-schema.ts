import { createdAt, updatedAt } from '@trend-diary/common/schemas'
import { z } from 'zod'

export const activeUserSchema = z.object({
  activeUserId: z.bigint().positive(),
  userId: z.bigint().positive(),
  email: z.string().email().max(320), // RFC 5322の最大長
  displayName: z.string().max(64).optional().nullable(), // オプションで最大長64文字
  authenticationId: z.string().uuid().optional().nullable(), // Supabase AuthenticationユーザーID
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
