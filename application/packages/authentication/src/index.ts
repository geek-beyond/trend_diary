export { AuthAdminClient, type AuthAdminConfig, type AuthUserSummary } from './admin/client'
export {
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UnexpectedAuthError,
  UserAlreadyExistsError,
} from './errors'
export { OAuthClient } from './oauth/client'
export { OAUTH_PROVIDERS, type OAuthProvider } from './oauth/provider'
export { PasskeyClient } from './passkey/client'
export { PasswordAuthClient } from './password/client'
export { SessionClient } from './session/client'
export {
  type AuthClientConfig,
  authClientConfig,
  type AuthRequestContext,
} from './infrastructure/supabase-client'
