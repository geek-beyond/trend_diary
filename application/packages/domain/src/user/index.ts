import { createAccountUseCase } from './factory'
import type { ActiveUser, ActiveUserInput, CurrentUser } from './schema/active-user-schema'
import { activeUserInputSchema, activeUserSchema } from './schema/active-user-schema'
import type { AuthInput, PasskeyVerifyInput } from './schema/auth-schema'
import { authInputSchema, passkeyVerifyInputSchema } from './schema/auth-schema'
import type {
  WebAuthnAuthenticationOptions,
  WebAuthnRegistrationOptions,
} from './schema/webauthn-schema'

// 型
export type {
  ActiveUser,
  ActiveUserInput,
  AuthInput,
  CurrentUser,
  PasskeyVerifyInput,
  WebAuthnAuthenticationOptions,
  WebAuthnRegistrationOptions,
}
// スキーマ
// ファクトリ
export {
  activeUserInputSchema,
  activeUserSchema,
  authInputSchema,
  createAccountUseCase,
  passkeyVerifyInputSchema,
}
