import type { ClientError, ServerError } from '@trend-diary/common/errors'
import type { Nullable } from '@trend-diary/common/types/utility'
import { type Result } from 'neverthrow'
import type { CurrentUser } from './schema/active-user-schema'
import type {
  AuthenticationSession,
  AuthenticationUser,
  PasskeyChallenge,
  PasskeyRegistrationResult,
  PasskeyVerifyInput,
  RegisteredPasskey,
  VerifiedSession,
} from './schema/auth-schema'

export interface Query {
  findActiveById(id: bigint): Promise<Result<Nullable<CurrentUser>, Error>>
  findActiveByEmail(email: string): Promise<Result<Nullable<CurrentUser>, Error>>
  findActiveByAuthenticationId(
    authenticationId: string,
  ): Promise<Result<Nullable<CurrentUser>, Error>>
}

/**
 * 任意のメッセージを外部へ送信する通知ポート
 */
export interface Notifier {
  sendMessage(content: string): Promise<void>
}

/**
 * CAPTCHAトークンを検証するポート。
 * CAPTCHA未導入の環境では検証をスキップして許可する実装を許容する。
 */
export interface CaptchaVerifier {
  verify(token?: string): Promise<Result<void, ClientError | ServerError>>
}

export interface Command {
  createActiveWithAuthenticationId(
    email: string,
    authenticationId: string,
    notifier: Notifier,
    displayName?: string | null,
  ): Promise<Result<CurrentUser, ServerError>>
}

/**
 * 認証のサインアップ結果
 */
export interface AuthSignupResult {
  user: AuthenticationUser
  session: AuthenticationSession | null
}

/**
 * 認証のログイン結果
 */
export interface AuthLoginResult {
  user: AuthenticationUser
  session: AuthenticationSession
}

export interface AuthRepository {
  /**
   * ユーザーを作成する
   */
  signup(
    email: string,
    password: string,
  ): Promise<Result<AuthSignupResult, ClientError | ServerError>>

  /**
   * ログインする
   */
  login(
    email: string,
    password: string,
  ): Promise<Result<AuthLoginResult, ClientError | ServerError>>

  /**
   * ログアウトする
   */
  logout(): Promise<Result<void, ServerError>>

  /**
   * アクセストークン(JWT)をローカル検証し、検証済みセッションを取得する
   */
  verifySession(): Promise<Result<VerifiedSession, ClientError | ServerError>>

  /**
   * セッションを更新する
   */
  refreshSession(): Promise<Result<AuthLoginResult, ServerError>>

  /**
   * ユーザーを削除する（補償トランザクション用）
   */
  deleteUser(userId: string): Promise<Result<void, ServerError>>

  /**
   * passkey登録を開始し、WebAuthnの資格情報生成オプションを取得する（要認証セッション）
   */
  startPasskeyRegistration(): Promise<Result<PasskeyChallenge, ServerError>>

  /**
   * ブラウザで生成した資格情報を検証し、passkeyを登録する（要認証セッション）
   */
  verifyPasskeyRegistration(
    input: PasskeyVerifyInput,
  ): Promise<Result<PasskeyRegistrationResult, ClientError | ServerError>>

  /**
   * passkey認証を開始し、WebAuthnの資格情報リクエストオプションを取得する（未認証で可）
   */
  startPasskeyAuthentication(): Promise<Result<PasskeyChallenge, ClientError | ServerError>>

  /**
   * ブラウザで生成した資格情報を検証し、セッションを確立する（未認証で可）
   */
  verifyPasskeyAuthentication(
    input: PasskeyVerifyInput,
  ): Promise<Result<AuthLoginResult, ClientError | ServerError>>

  /**
   * 現在のユーザーに登録済みのpasskey一覧を取得する（要認証セッション）
   */
  listPasskeys(): Promise<Result<RegisteredPasskey[], ServerError>>
}
