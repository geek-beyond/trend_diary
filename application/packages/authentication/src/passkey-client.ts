import type { User } from '@supabase/supabase-js'
import { ClientError, ServerError } from '@trend-diary/common/errors'
import { err, ok, type Result } from 'neverthrow'
import type { SupabaseAuthClient } from './supabase-client'
import { callSupabase } from './supabase-result'

type PasskeyApi = SupabaseAuthClient['auth']['passkey']
type VerifyRegistrationParams = Parameters<PasskeyApi['verifyRegistration']>[0]
type VerifyAuthenticationParams = Parameters<PasskeyApi['verifyAuthentication']>[0]
type DeleteParams = Parameters<PasskeyApi['delete']>[0]

export class PasskeyClient {
  constructor(private readonly client: SupabaseAuthClient) {}

  async startRegistration() {
    return callSupabase(
      () => this.client.auth.passkey.startRegistration(),
      (error) => new ServerError(`Passkey registration start failed: ${error.message}`),
    )
  }

  async verifyRegistration(params: VerifyRegistrationParams) {
    return callSupabase(
      () => this.client.auth.passkey.verifyRegistration(params),
      (error) => new ClientError(`Passkey registration failed: ${error.message}`, 400),
    )
  }

  async startAuthentication() {
    return callSupabase(
      () => this.client.auth.passkey.startAuthentication(),
      (error) => new ServerError(`Passkey authentication start failed: ${error.message}`),
    )
  }

  // 成功でも user/session が空なら認証失敗として err に畳み、呼び出し側でのResult外エラー処理を無くす
  async verifyAuthentication(params: VerifyAuthenticationParams): Promise<Result<User, Error>> {
    return (
      await callSupabase(
        () => this.client.auth.passkey.verifyAuthentication(params),
        () => new ClientError('Invalid passkey', 401),
      )
    ).andThen(({ user, session }) =>
      user && session ? ok(user) : err(new ServerError('Passkey authentication failed')),
    )
  }

  async list() {
    return callSupabase(
      () => this.client.auth.passkey.list(),
      (error) => new ServerError(`Passkey list failed: ${error.message}`),
    )
  }

  async delete(params: DeleteParams) {
    return callSupabase(
      () => this.client.auth.passkey.delete(params),
      (error) => new ServerError(`Passkey deletion failed: ${error.message}`),
    )
  }
}
