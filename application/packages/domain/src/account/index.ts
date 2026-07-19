import { createAccountUseCase } from './factory'
import type { Notifier } from './repository'
import type { ActiveUser, ActiveUserInput, CurrentUser } from './schema/active-user-schema'
import { activeUserInputSchema, activeUserSchema } from './schema/active-user-schema'
import type { AuthInput, OAuthCallbackQuery, OAuthLoginQuery } from './schema/auth-schema'
import {
  authInputSchema,
  oauthCallbackQuerySchema,
  oauthLoginQuerySchema,
} from './schema/auth-schema'
import type { AccountUseCase } from './use-case'

// 型
export type {
  AccountUseCase,
  ActiveUser,
  ActiveUserInput,
  AuthInput,
  CurrentUser,
  Notifier,
  OAuthCallbackQuery,
  OAuthLoginQuery,
}
// スキーマ
// ファクトリ
export {
  activeUserInputSchema,
  activeUserSchema,
  authInputSchema,
  createAccountUseCase,
  oauthCallbackQuerySchema,
  oauthLoginQuerySchema,
}
