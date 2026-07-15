import type { User, UserIdentity } from '@supabase/supabase-js'
import { err, ok, type Result } from 'neverthrow'
import { type AuthError, UnexpectedAuthError } from './errors'
import {
  type AuthClientConfig,
  createBackendClient,
  type SupabaseAuthClient,
} from './supabase-client'
import { callSupabase } from './supabase-result'

export type OAuthProvider = 'github'

export class OAuthClient {
  private readonly client: SupabaseAuthClient

  constructor(config: AuthClientConfig) {
    this.client = createBackendClient(config)
  }

  // ブラウザ遷移はサーバ側で行うため skipBrowserRedirect で認可URLの発行だけに留める。url が空なら失敗として畳む
  async startAuthorization(
    provider: OAuthProvider,
    redirectTo: string,
  ): Promise<Result<{ url: string }, AuthError>> {
    return (
      await callSupabase(() =>
        this.client.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        }),
      )
    ).andThen(({ url }) =>
      url ? ok({ url }) : err(new UnexpectedAuthError('OAuth authorization start failed')),
    )
  }

  async startLink(
    provider: OAuthProvider,
    redirectTo: string,
  ): Promise<Result<{ url: string }, AuthError>> {
    return (
      await callSupabase(() =>
        this.client.auth.linkIdentity({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        }),
      )
    ).andThen(({ url }) =>
      url ? ok({ url }) : err(new UnexpectedAuthError('OAuth link start failed')),
    )
  }

  // 成功でも user/session が空なら失敗として err に畳み、呼び出し側でのResult外エラー処理を無くす
  async exchangeCode(code: string): Promise<Result<User, AuthError>> {
    return (await callSupabase(() => this.client.auth.exchangeCodeForSession(code))).andThen(
      ({ user, session }) =>
        user && session ? ok(user) : err(new UnexpectedAuthError('OAuth code exchange failed')),
    )
  }

  async listIdentities(): Promise<Result<UserIdentity[], AuthError>> {
    return (await callSupabase(() => this.client.auth.getUserIdentities())).map(
      ({ identities }) => identities,
    )
  }

  async unlinkIdentity(identity: UserIdentity): Promise<Result<null, AuthError>> {
    return callSupabase(async () => ({
      ...(await this.client.auth.unlinkIdentity(identity)),
      data: null,
    }))
  }
}
