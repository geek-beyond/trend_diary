import { AuthError, type User } from '@supabase/supabase-js'
import { err, ok, type Result } from 'neverthrow'
import { AuthenticationError } from './errors'
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
  async signIn(credentials: PasswordCredentials): Promise<Result<User, AuthenticationError>> {
    return (
      await callSupabase(() => this.client.auth.signInWithPassword(credentials), toSignInError)
    ).andThen(({ user, session }) =>
      user && session ? ok(user) : err(new AuthenticationError('unexpected', 'Sign in failed')),
    )
  }

  // 成功でも user が空なら登録失敗として err に畳み、呼び出し側でのResult外エラー処理を無くす
  async signUp(credentials: PasswordCredentials): Promise<Result<User, AuthenticationError>> {
    return (await callSupabase(() => this.client.auth.signUp(credentials), toSignUpError)).andThen(
      ({ user }) =>
        user
          ? ok(user)
          : err(new AuthenticationError('registration_failed', 'User registration failed')),
    )
  }

  // 既にログアウト済みでもSupabaseはエラーを返さないため、error は通信・サーバ障害のみを表す
  async signOut(): Promise<Result<null, AuthenticationError>> {
    return callSupabase(async () => ({ ...(await this.client.auth.signOut()), data: null }))
  }
}

function toSignInError(error: Error): AuthenticationError {
  const isInvalidCredentials = error instanceof AuthError && error.code === 'invalid_credentials'
  return isInvalidCredentials
    ? new AuthenticationError('invalid_credentials', error.message, { cause: error })
    : new AuthenticationError('unexpected', error.message, { cause: error })
}

// NOTE: Supabaseは専用エラー型を提供しないためメッセージ文字列で既存ユーザーを判定している
function toSignUpError(error: Error): AuthenticationError {
  return error.message.includes('already registered')
    ? new AuthenticationError('user_already_exists', error.message, { cause: error })
    : new AuthenticationError('unexpected', error.message, { cause: error })
}
