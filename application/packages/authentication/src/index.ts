export { AuthAdminClient, type AuthAdminConfig, type AuthUserSummary } from './auth-admin-client'
export {
  AuthError,
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UnexpectedAuthError,
  UserAlreadyExistsError,
} from './errors'
export { OAuthClient } from './oauth-client'
export { OAUTH_PROVIDERS, type OAuthProvider } from './oauth-provider'
export { PasskeyClient } from './passkey-client'
export { PasswordAuthClient } from './password-auth-client'
export { SessionClient } from './session-client'
export { type AuthClientConfig, authClientConfig, type AuthRequestContext } from './supabase-client'
