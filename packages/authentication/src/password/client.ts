import { AuthError, type User } from '@supabase/supabase-js'
import { err, ok, type Result } from 'neverthrow'
import { InvalidCredentialsError, UnexpectedAuthError, UserAlreadyExistsError } from '../errors'
import {
  type AuthClientConfig,
  createBackendClient,
  type SupabaseAuthClient,
} from '../infrastructure/supabase-client'
import { callSupabase } from '../infrastructure/supabase-result'

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
  async signIn(
    credentials: PasswordCredentials,
  ): Promise<Result<User, InvalidCredentialsError | UnexpectedAuthError>> {
    return (
      await callSupabase(() => this.client.auth.signInWithPassword(credentials), toSignInError)
    ).andThen(({ user, session }) =>
      user && session ? ok(user) : err(new UnexpectedAuthError('Sign in failed')),
    )
  }

  // 成功でも user が空なら登録失敗として err に畳み、呼び出し側でのResult外エラー処理を無くす
  async signUp(
    credentials: PasswordCredentials,
  ): Promise<Result<User, UserAlreadyExistsError | UnexpectedAuthError>> {
    return (await callSupabase(() => this.client.auth.signUp(credentials), toSignUpError)).andThen(
      ({ user }) => (user ? ok(user) : err(new UnexpectedAuthError('User registration failed'))),
    )
  }

  // 既にログアウト済みでもSupabaseはエラーを返さないため、error は通信・サーバ障害のみを表す
  async signOut(): Promise<Result<null, UnexpectedAuthError>> {
    return callSupabase(async () => ({ ...(await this.client.auth.signOut()), data: null }))
  }
}

function toSignInError(error: Error): InvalidCredentialsError | UnexpectedAuthError {
  const isInvalidCredentials = error instanceof AuthError && error.code === 'invalid_credentials'
  return isInvalidCredentials
    ? new InvalidCredentialsError(error.message)
    : new UnexpectedAuthError(error.message)
}

// NOTE: Supabaseは専用エラー型を提供しないためメッセージ文字列で既存ユーザーを判定している
function toSignUpError(error: Error): UserAlreadyExistsError | UnexpectedAuthError {
  return error.message.includes('already registered')
    ? new UserAlreadyExistsError(error.message)
    : new UnexpectedAuthError(error.message)
}
