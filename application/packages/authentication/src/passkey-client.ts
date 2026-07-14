import type { User } from '@supabase/supabase-js'
import { err, ok, type Result } from 'neverthrow'
import { AuthenticationError } from './errors'
import {
  type AuthClientConfig,
  createBackendClient,
  type SupabaseAuthClient,
} from './supabase-client'
import { callSupabase } from './supabase-result'

type PasskeyApi = SupabaseAuthClient['auth']['passkey']
type VerifyRegistrationParams = Parameters<PasskeyApi['verifyRegistration']>[0]
type VerifyAuthenticationParams = Parameters<PasskeyApi['verifyAuthentication']>[0]
type DeleteParams = Parameters<PasskeyApi['delete']>[0]

export class PasskeyClient {
  private readonly client: SupabaseAuthClient

  constructor(config: AuthClientConfig) {
    this.client = createBackendClient(config)
  }

  async startRegistration() {
    return callSupabase(() => this.client.auth.passkey.startRegistration())
  }

  async verifyRegistration(params: VerifyRegistrationParams) {
    return callSupabase(
      () => this.client.auth.passkey.verifyRegistration(params),
      (error) =>
        new AuthenticationError('passkey_registration_failed', error.message, { cause: error }),
    )
  }

  async startAuthentication() {
    return callSupabase(() => this.client.auth.passkey.startAuthentication())
  }

  // 成功でも user/session が空なら認証失敗として err に畳み、呼び出し側でのResult外エラー処理を無くす
  async verifyAuthentication(
    params: VerifyAuthenticationParams,
  ): Promise<Result<User, AuthenticationError>> {
    return (
      await callSupabase(
        () => this.client.auth.passkey.verifyAuthentication(params),
        (error) =>
          new AuthenticationError('passkey_verification_failed', error.message, { cause: error }),
      )
    ).andThen(({ user, session }) =>
      user && session
        ? ok(user)
        : err(
            new AuthenticationError('passkey_verification_failed', 'Passkey authentication failed'),
          ),
    )
  }

  async list() {
    return callSupabase(() => this.client.auth.passkey.list())
  }

  async delete(params: DeleteParams) {
    return callSupabase(() => this.client.auth.passkey.delete(params))
  }
}
