import { createAuthUseCase } from './factory'
import type { ActiveUser, ActiveUserInput, CurrentUser } from './schema/active-user-schema'
import { activeUserInputSchema, activeUserSchema } from './schema/active-user-schema'
import type { AuthenticationSession, AuthInput, PasskeyVerifyInput } from './schema/auth-schema'
import { authInputSchema, passkeyVerifyInputSchema } from './schema/auth-schema'
import type { Theme, ThemeUpdate } from './schema/theme-schema'
import { themeSchema, themeUpdateSchema } from './schema/theme-schema'

// 型
export type {
  ActiveUser,
  ActiveUserInput,
  AuthenticationSession,
  AuthInput,
  CurrentUser,
  PasskeyVerifyInput,
  Theme,
  ThemeUpdate,
}
// スキーマ
// ファクトリ
export {
  activeUserInputSchema,
  activeUserSchema,
  authInputSchema,
  createAuthUseCase,
  passkeyVerifyInputSchema,
  themeSchema,
  themeUpdateSchema,
}
