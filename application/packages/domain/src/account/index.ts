import { AccountError, ActiveUserNotFoundError, AccountRepositoryError } from './error'
import { createAccountUseCase } from './factory'
import type { ActiveUser, ActiveUserInput, CurrentUser } from './schema/active-user-schema'
import { activeUserInputSchema, activeUserSchema } from './schema/active-user-schema'
import type { AuthInput, OAuthCallbackQuery, OAuthLoginQuery } from './schema/auth-schema'
import {
  authInputSchema,
  oauthCallbackQuerySchema,
  oauthLoginQuerySchema,
} from './schema/auth-schema'

// 型
export type {
  ActiveUser,
  ActiveUserInput,
  AuthInput,
  CurrentUser,
  OAuthCallbackQuery,
  OAuthLoginQuery,
}
// スキーマ
// ファクトリ
export {
  AccountError,
  AccountRepositoryError,
  ActiveUserNotFoundError,
  activeUserInputSchema,
  activeUserSchema,
  authInputSchema,
  createAccountUseCase,
  oauthCallbackQuerySchema,
  oauthLoginQuerySchema,
}
