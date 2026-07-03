import {
  AuthInvalidCredentialsError,
  type Session,
  type SupabaseClient,
  type User,
  type VerifyPasskeyAuthenticationParams,
  type VerifyPasskeyRegistrationParams,
} from '@supabase/supabase-js'
import { AlreadyExistsError, ClientError, ServerError } from '@trend-diary/common/errors'
import UnauthorizedError from '@trend-diary/common/errors/client-error/unauthorized-error'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { err, ok, type Result } from 'neverthrow'
import type { AuthLoginResult, AuthRepository, AuthSignupResult } from '../repository'
import type {
  AuthenticationUser,
  PasskeyChallenge,
  PasskeyRegistrationResult,
  PasskeyVerifyInput,
  RegisteredPasskey,
  VerifiedSession,
} from '../schema/auth-schema'

/**
 * Supabaseのユーザー登録エラーが「既に存在する」ことを示すかチェック
 * NOTE: Supabaseのバージョンアップでエラーメッセージが変わる可能性がある
 * 現時点では専用のエラー型が提供されていないため、メッセージ文字列で判定している
 */
function hasMessage(value: unknown): value is { message: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'message' in value &&
    typeof value.message === 'string'
  )
}

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
  if (hasMessage(error)) {
    const message = error.message.toLowerCase()
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

  async verifySession(): Promise<Result<VerifiedSession, ClientError | ServerError>> {
    // getClaimsは非対称署名鍵ならJWKSをローカルキャッシュして署名検証を行い、Supabaseへの往復を省く
    const result = await wrapAsyncCall(() => this.client.auth.getClaims())
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { data, error } = result.value

    // 検証失敗(改ざん・期限切れ等)は、認証ゲートでは未認証として扱う
    if (error) {
      return err(
        new UnauthorizedError('session verification failed', {
          sessionExists: true,
        }),
      )
    }

    if (!data) {
      return err(
        new UnauthorizedError('session not found', {
          sessionExists: false,
        }),
      )
    }

    return ok({ authenticationId: data.claims.sub })
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

  async startPasskeyRegistration(): Promise<Result<PasskeyChallenge, ServerError>> {
    const result = await wrapAsyncCall(() => this.client.auth.passkey.startRegistration())
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { data, error } = result.value
    if (error || !data) {
      return err(new ServerError(`Passkey registration start failed: ${error?.message}`))
    }

    return ok({ challengeId: data.challenge_id, options: data.options })
  }

  async verifyPasskeyRegistration(
    input: PasskeyVerifyInput,
  ): Promise<Result<PasskeyRegistrationResult, ClientError | ServerError>> {
    const result = await wrapAsyncCall(() =>
      this.client.auth.passkey.verifyRegistration({
        challengeId: input.challengeId,
        // oxlint-disable-next-line typescript/consistent-type-assertions -- WebAuthn ceremonyの結果JSONはSupabaseが真正性を検証する不透明値のため、境界でSDKの資格情報型に合わせる
        credential: input.credential as unknown as VerifyPasskeyRegistrationParams['credential'],
      }),
    )
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { data, error } = result.value
    if (error || !data) {
      // 資格情報の不一致など、ユーザーの再操作で解消しうる失敗として400で返す
      return err(new ClientError(`Passkey registration failed: ${error?.message}`, 400))
    }

    return ok({ id: data.id, friendlyName: data.friendly_name })
  }

  async startPasskeyAuthentication(): Promise<Result<PasskeyChallenge, ClientError | ServerError>> {
    const result = await wrapAsyncCall(() => this.client.auth.passkey.startAuthentication())
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { data, error } = result.value
    if (error || !data) {
      return err(new ServerError(`Passkey authentication start failed: ${error?.message}`))
    }

    return ok({ challengeId: data.challenge_id, options: data.options })
  }

  async verifyPasskeyAuthentication(
    input: PasskeyVerifyInput,
  ): Promise<Result<AuthLoginResult, ClientError | ServerError>> {
    const result = await wrapAsyncCall(() =>
      this.client.auth.passkey.verifyAuthentication({
        challengeId: input.challengeId,
        // oxlint-disable-next-line typescript/consistent-type-assertions -- WebAuthn ceremonyの結果JSONはSupabaseが真正性を検証する不透明値のため、境界でSDKの資格情報型に合わせる
        credential: input.credential as unknown as VerifyPasskeyAuthenticationParams['credential'],
      }),
    )
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { data, error } = result.value
    if (error) {
      // 資格情報の不一致・失効などは認証失敗として401で返す
      return err(new ClientError('Invalid passkey', 401))
    }

    if (!data?.user || !data.session) {
      return err(new ServerError('Passkey authentication failed'))
    }

    const userResult = this.toAuthenticationUser(data.user)
    if (userResult.isErr()) {
      return err(userResult.error)
    }

    return ok({
      user: userResult.value,
      session: this.toSessionObject(data.session, userResult.value),
    })
  }

  async listPasskeys(): Promise<Result<RegisteredPasskey[], ServerError>> {
    const result = await wrapAsyncCall(() => this.client.auth.passkey.list())
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { data, error } = result.value
    if (error || !data) {
      return err(new ServerError(`Passkey list failed: ${error?.message}`))
    }

    return ok(
      data.map((passkey) => ({
        id: passkey.id,
        friendlyName: passkey.friendly_name,
        createdAt: new Date(passkey.created_at),
        lastUsedAt: passkey.last_used_at ? new Date(passkey.last_used_at) : undefined,
      })),
    )
  }
}
