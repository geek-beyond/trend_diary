import type { User } from '@supabase/supabase-js'
import { err, ok, type Result } from 'neverthrow'
import { PasskeyRegistrationError, PasskeyVerificationError, UnexpectedAuthError } from '../errors'
import {
  type AuthClientConfig,
  createBackendClient,
  type SupabaseAuthClient,
} from '../infrastructure/supabase-client'
import { callSupabase } from '../infrastructure/supabase-result'

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
      (error) => new PasskeyRegistrationError(error.message),
    )
  }

  async startAuthentication() {
    return callSupabase(() => this.client.auth.passkey.startAuthentication())
  }

  // 成功でも user/session が空なら認証失敗として err に畳み、呼び出し側でのResult外エラー処理を無くす
  async verifyAuthentication(
    params: VerifyAuthenticationParams,
  ): Promise<Result<User, PasskeyVerificationError | UnexpectedAuthError>> {
    return (
      await callSupabase(
        () => this.client.auth.passkey.verifyAuthentication(params),
        (error) => new PasskeyVerificationError(error.message),
      )
    ).andThen(({ user, session }) =>
      user && session ? ok(user) : err(new UnexpectedAuthError('Passkey authentication failed')),
    )
  }

  async list() {
    return callSupabase(() => this.client.auth.passkey.list())
  }

  async delete(params: DeleteParams) {
    return callSupabase(() => this.client.auth.passkey.delete(params))
  }
}
