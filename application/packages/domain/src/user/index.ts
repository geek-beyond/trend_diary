import { createAuthUseCase } from './factory'
import type { ActiveUser, ActiveUserInput, CurrentUser } from './schema/active-user-schema'
import { activeUserInputSchema, activeUserSchema } from './schema/active-user-schema'
import type {
  AuthenticationSession,
  AuthInput,
  OAuthCallbackQuery,
  OAuthLoginQuery,
  PasskeyVerifyInput,
} from './schema/auth-schema'
import {
  authInputSchema,
  oauthCallbackQuerySchema,
  oauthLoginQuerySchema,
  passkeyVerifyInputSchema,
} from './schema/auth-schema'

// 型
export type {
  ActiveUser,
  ActiveUserInput,
  AuthenticationSession,
  AuthInput,
  CurrentUser,
  OAuthCallbackQuery,
  OAuthLoginQuery,
  PasskeyVerifyInput,
}
// スキーマ
// ファクトリ
export {
  activeUserInputSchema,
  activeUserSchema,
  authInputSchema,
  createAuthUseCase,
  oauthCallbackQuerySchema,
  oauthLoginQuerySchema,
  passkeyVerifyInputSchema,
}
