export { AuthAdminClient, type AuthAdminConfig, type AuthUserSummary } from './auth-admin-client'
export {
  AuthenticationError,
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UnexpectedAuthError,
  UserAlreadyExistsError,
} from './errors'
export { PasskeyClient } from './passkey-client'
export { PasswordAuthClient } from './password-auth-client'
export { SessionClient } from './session-client'
export { type AuthClientConfig, authClientConfig, type AuthRequestContext } from './supabase-client'
