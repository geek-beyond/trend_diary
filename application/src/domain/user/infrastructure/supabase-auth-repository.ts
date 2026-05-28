import {
  AuthInvalidCredentialsError,
  AuthSessionMissingError,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js'
import { err, ok, type Result } from 'neverthrow'
import { AlreadyExistsError, ClientError, ServerError } from '@/common/errors'
import UnauthorizedError from '@/common/errors/client-error/unauthorized-error'
import { wrapAsyncCall } from '@/common/result'
import type { AuthLoginResult, AuthRepository, AuthSignupResult } from '../repository'
import type { AuthenticationUser } from '../schema/auth-schema'

/**
 * Supabaseのユーザー登録エラーが「既に存在する」ことを示すかチェック
 * NOTE: Supabaseのバージョンアップでエラーメッセージが変わる可能性がある
 * 現時点では専用のエラー型が提供されていないため、メッセージ文字列で判定している
 */
function isUserAlreadyExistsError(error: { message: string }): boolean {
  return error.message.includes('already registered')
}

/**
 * Supabaseのログインエラーが「認証情報が不正」であることを示すかチェック
 * NOTE: instanceofチェックが動作しない場合のフォールバック
 * ローカルSupabaseと本番Supabaseで挙動が異なる可能性がある
 */
function isInvalidCredentialsError(error: unknown): boolean {
  if (error instanceof AuthInvalidCredentialsError) {
    return true
  }
  // フォールバック: メッセージ文字列でも判定
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: string }).message.toLowerCase()
    return message.includes('invalid login credentials') || message.includes('invalid credentials')
  }
  return false
}

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Supabaseのユーザーオブジェクトを AuthenticationUser 型に変換する共通ヘルパー
   */
  private toAuthenticationUser(
    user: User,
    fallbackEmail?: string,
  ): Result<AuthenticationUser, ServerError> {
    const email = user.email ?? fallbackEmail
    if (!email) {
      return err(new ServerError('User email is missing from Supabase response'))
    }

    return ok({
      id: user.id,
      email,
      emailConfirmedAt: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
      createdAt: new Date(user.created_at),
    })
  }

  /**
   * Supabaseのセッションオブジェクトを session 型に変換する共通ヘルパー
   */
  private toSessionObject(session: Session, user: AuthenticationUser) {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in ?? 3600,
      expiresAt: session.expires_at,
      user,
    }
  }

  async signup(
    email: string,
    password: string,
  ): Promise<Result<AuthSignupResult, ClientError | ServerError>> {
    const result = await wrapAsyncCall(() =>
      this.client.auth.signUp({
        email,
        password,
      }),
    )
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { data, error } = result.value
    if (error) {
      // 既に存在するユーザーの場合は AlreadyExistsError を返す
      // UX上、「既に使用されています」と明示することは一般的であり、
      // セキュリティリスクも比較的小さいと判断
      if (isUserAlreadyExistsError(error)) {
        return err(new AlreadyExistsError('User already exists'))
      }

      return err(new ServerError(`Authentication service error: ${error.message}`))
    }

    if (!data.user) {
      return err(new ServerError('User registration failed'))
    }

    const userResult = this.toAuthenticationUser(data.user, email)
    if (userResult.isErr()) {
      return err(userResult.error)
    }

    let session: AuthSignupResult['session'] = null
    if (data.session) {
      session = this.toSessionObject(data.session, userResult.value)
    }

    return ok({
      user: userResult.value,
      session,
    })
  }

  async login(
    email: string,
    password: string,
  ): Promise<Result<AuthLoginResult, ClientError | ServerError>> {
    const result = await wrapAsyncCall(() =>
      this.client.auth.signInWithPassword({
        email,
        password,
      }),
    )
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { data, error } = result.value
    if (error) {
      // 認証失敗チェック（instanceofとメッセージの両方で判定）
      if (isInvalidCredentialsError(error)) {
        return err(new ClientError('Invalid email or password', 401))
      }

      return err(new ServerError(`Authentication service error: ${error.message}`))
    }

    if (!data.user || !data.session) {
      return err(new ServerError('Authentication failed'))
    }

    const userResult = this.toAuthenticationUser(data.user, email)
    if (userResult.isErr()) {
      return err(userResult.error)
    }

    const session = this.toSessionObject(data.session, userResult.value)

    return ok({
      user: userResult.value,
      session,
    })
  }

  async logout(): Promise<Result<void, ServerError>> {
    const result = await wrapAsyncCall(() => this.client.auth.signOut())
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { error } = result.value
    if (error) {
      return err(new ServerError(`Logout failed: ${error.message}`))
    }

    return ok(undefined)
  }

  async getCurrentUser(): Promise<Result<AuthenticationUser, ServerError>> {
    const result = await wrapAsyncCall(() => this.client.auth.getUser())
    if (result.isErr()) {
      if (result.error instanceof AuthSessionMissingError) {
        return err(
          new UnauthorizedError('session not found', {
            sessionExists: false,
          }),
        )
      }
      return err(new ServerError(result.error))
    }

    const {
      data: { user },
    } = result.value

    if (!user) {
      return err(
        new UnauthorizedError('session not found', {
          sessionExists: true,
        }),
      )
    }

    const authUserResult = this.toAuthenticationUser(user)
    if (authUserResult.isErr()) {
      return authUserResult
    }

    return ok(authUserResult.value)
  }

  async refreshSession(): Promise<Result<AuthLoginResult, ServerError>> {
    const result = await wrapAsyncCall(() => this.client.auth.refreshSession())
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const {
      data: { session },
      error,
    } = result.value
    if (error || !session) {
      return err(new ServerError(`Session refresh failed: ${error?.message}`))
    }

    const userResult = this.toAuthenticationUser(session.user)
    if (userResult.isErr()) {
      return err(userResult.error)
    }

    return ok({
      user: userResult.value,
      session: this.toSessionObject(session, userResult.value),
    })
  }

  async deleteUser(userId: string): Promise<Result<void, ServerError>> {
    const result = await wrapAsyncCall(() => this.client.auth.admin.deleteUser(userId))
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { error } = result.value
    if (error) {
      return err(new ServerError(`User deletion failed: ${error.message}`))
    }

    return ok(undefined)
  }
}
