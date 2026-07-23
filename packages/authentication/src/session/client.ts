import { err, ok, type Result } from 'neverthrow'
import { NoSessionError, type UnexpectedAuthError } from '../errors'
import {
  type AuthClientConfig,
  createBackendClient,
  type SupabaseAuthClient,
} from '../infrastructure/supabase-client'
import { callSupabase } from '../infrastructure/supabase-result'

export class SessionClient {
  private readonly client: SupabaseAuthClient

  constructor(config: AuthClientConfig) {
    this.client = createBackendClient(config)
  }

  // セッション無し・失効はエラーではなく未認証として扱うため、業務エラーも空データも一律 NoSessionError に畳む
  async getClaims(): Promise<
    Result<{ authenticationId: string }, NoSessionError | UnexpectedAuthError>
  > {
    return (
      await callSupabase(
        () => this.client.auth.getClaims(),
        (error) => new NoSessionError(error.message),
      )
    ).andThen((data) =>
      data
        ? ok({ authenticationId: data.claims.sub })
        : err(new NoSessionError('No session found')),
    )
  }
}
