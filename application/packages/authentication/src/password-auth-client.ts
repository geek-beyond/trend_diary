import { AuthError, type User } from '@supabase/supabase-js'
import { AlreadyExistsError, ClientError, ServerError } from '@trend-diary/common/errors'
import { err, ok, type Result } from 'neverthrow'
import {
  type AuthClientConfig,
  createBackendClient,
  type SupabaseAuthClient,
} from './supabase-client'
import { callSupabase } from './supabase-result'

interface PasswordCredentials {
  email: string
  password: string
}

export class PasswordAuthClient {
  private readonly client: SupabaseAuthClient

  constructor(config: AuthClientConfig) {
    this.client = createBackendClient(config)
  }

  // 成功でも user/session が空なら失敗として err に畳み、呼び出し側でのResult外エラー処理を無くす
  async signIn(credentials: PasswordCredentials): Promise<Result<User, Error>> {
    return (
      await callSupabase(() => this.client.auth.signInWithPassword(credentials), toSignInError)
    ).andThen(({ user, session }) =>
      user && session ? ok(user) : err(new ServerError('Sign in failed')),
    )
  }

  // 成功でも user が空なら登録失敗として err に畳み、呼び出し側でのResult外エラー処理を無くす
  async signUp(credentials: PasswordCredentials): Promise<Result<User, Error>> {
    return (await callSupabase(() => this.client.auth.signUp(credentials), toSignUpError)).andThen(
      ({ user }) => (user ? ok(user) : err(new ServerError('User registration failed'))),
    )
  }

  // 既にログアウト済みでもSupabaseはエラーを返さないため、error は通信・サーバ障害のみを表す
  async signOut(): Promise<Result<null, Error>> {
    return callSupabase(async () => ({ ...(await this.client.auth.signOut()), data: null }))
  }
}

function toSignInError(error: Error): Error {
  const isInvalidCredentials = error instanceof AuthError && error.code === 'invalid_credentials'
  return isInvalidCredentials
    ? new ClientError('Invalid email or password', 401)
    : new ServerError(`Authentication service error: ${error.message}`)
}

// 既に存在するユーザーは409で明示する。UX上一般的でセキュリティリスクも比較的小さいと判断。
// NOTE: Supabaseは専用エラー型を提供しないためメッセージ文字列で判定している
function toSignUpError(error: Error): Error {
  return error.message.includes('already registered')
    ? new AlreadyExistsError('User already exists')
    : new ServerError(`Authentication service error: ${error.message}`)
}
