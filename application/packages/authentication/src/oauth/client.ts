import type { OAuthResponse, User, UserIdentity } from '@supabase/supabase-js'
import { err, ok, type Result } from 'neverthrow'
import { UnexpectedAuthError } from '../errors'
import {
  type AuthClientConfig,
  createBackendClient,
  type SupabaseAuthClient,
} from '../infrastructure/supabase-client'
import { callSupabase } from '../infrastructure/supabase-result'
import type { OAuthProvider } from './provider'

export class OAuthClient {
  private readonly client: SupabaseAuthClient

  constructor(config: AuthClientConfig) {
    this.client = createBackendClient(config)
  }

  // 認可URLの発行はログイン(signInWithOAuth)と連携(linkIdentity)でSDKメソッドだけが異なる。
  // ブラウザ遷移はサーバ側で行うため skipBrowserRedirect で発行だけに留め、url が空なら失敗として畳む
  private async startFlow(
    request: () => Promise<OAuthResponse>,
    failureLabel: string,
  ): Promise<Result<{ url: string }, UnexpectedAuthError>> {
    return (await callSupabase(request)).andThen(({ url }) =>
      url ? ok({ url }) : err(new UnexpectedAuthError(failureLabel)),
    )
  }

  async startAuthorization(
    provider: OAuthProvider,
    redirectTo: string,
  ): Promise<Result<{ url: string }, UnexpectedAuthError>> {
    return this.startFlow(
      () =>
        this.client.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        }),
      'OAuth authorization start failed',
    )
  }

  async startLink(
    provider: OAuthProvider,
    redirectTo: string,
  ): Promise<Result<{ url: string }, UnexpectedAuthError>> {
    return this.startFlow(
      () =>
        this.client.auth.linkIdentity({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        }),
      'OAuth link start failed',
    )
  }

  // 成功でも user/session が空なら失敗として err に畳み、呼び出し側でのResult外エラー処理を無くす
  async exchangeCode(code: string): Promise<Result<User, UnexpectedAuthError>> {
    return (await callSupabase(() => this.client.auth.exchangeCodeForSession(code))).andThen(
      ({ user, session }) =>
        user && session ? ok(user) : err(new UnexpectedAuthError('OAuth code exchange failed')),
    )
  }

  async listIdentities(): Promise<Result<UserIdentity[], UnexpectedAuthError>> {
    return (await callSupabase(() => this.client.auth.getUserIdentities())).map(
      ({ identities }) => identities,
    )
  }

  async unlinkIdentity(identity: UserIdentity): Promise<Result<null, UnexpectedAuthError>> {
    return callSupabase(async () => ({
      ...(await this.client.auth.unlinkIdentity(identity)),
      data: null,
    }))
  }
}
