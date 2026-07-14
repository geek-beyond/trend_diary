import type { ClientError, ServerError } from '@trend-diary/common/errors'
import type { Nullable } from '@trend-diary/common/types/utility'
import { type Result } from 'neverthrow'
import type { CurrentUser } from './schema/active-user-schema'
import type {
  AuthenticationSession,
  AuthenticationUser,
  PasskeyAuthenticationChallenge,
  PasskeyRegistrationChallenge,
  PasskeyRegistrationResult,
  PasskeyVerifyInput,
  RegisteredPasskey,
  VerifiedSession,
} from './schema/auth-schema'

/**
 * 対応するOAuthプロバイダ。追加時はここに増やす
 */
export type OAuthProvider = 'github'

/**
 * OAuth認可の開始結果。ブラウザをこのURLへリダイレクトさせる
 */
export interface OAuthAuthorization {
  url: string
}

/**
 * 認証ユーザーに紐付くログイン手段（email / github など）
 */
export interface LinkedIdentity {
  provider: string
}

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
   * passkey登録を開始し、WebAuthnの資格情報生成オプションを取得する（要認証セッション）
   */
  startPasskeyRegistration(): Promise<Result<PasskeyRegistrationChallenge, ServerError>>

  /**
   * ブラウザで生成した資格情報を検証し、passkeyを登録する（要認証セッション）
   */
  verifyPasskeyRegistration(
    input: PasskeyVerifyInput,
  ): Promise<Result<PasskeyRegistrationResult, ClientError | ServerError>>

  /**
   * passkey認証を開始し、WebAuthnの資格情報リクエストオプションを取得する（未認証で可）
   */
  startPasskeyAuthentication(): Promise<
    Result<PasskeyAuthenticationChallenge, ClientError | ServerError>
  >

  /**
   * ブラウザで生成した資格情報を検証し、セッションを確立する（未認証で可）
   */
  verifyPasskeyAuthentication(
    input: PasskeyVerifyInput,
  ): Promise<Result<AuthLoginResult, ClientError | ServerError>>

  /**
   * ログイン中ユーザーの登録済みpasskey一覧を取得する（要認証セッション）
   */
  listPasskeys(): Promise<Result<RegisteredPasskey[], ServerError>>

  /**
   * ログイン中ユーザーのpasskeyを1件削除する（要認証セッション）
   */
  deletePasskey(passkeyId: string): Promise<Result<void, ServerError>>

  /**
   * OAuthログインの認可URLを発行する（未認証で可）。redirectToは認可後に戻るコールバックURL
   */
  startOAuthAuthorization(
    provider: OAuthProvider,
    redirectTo: string,
  ): Promise<Result<OAuthAuthorization, ServerError>>

  /**
   * OAuthコールバックの認可コードをセッションに交換し、認証ユーザーを返す（未認証で可）。
   * セッションの保存自体はSupabaseクライアント(プレゼン層のCookie)が担うため結果には含めない
   */
  exchangeOAuthCode(code: string): Promise<Result<AuthenticationUser, ClientError | ServerError>>

  /**
   * ログイン中ユーザーへOAuthアカウントを連携する認可URLを発行する（要認証セッション）
   */
  startOAuthLink(
    provider: OAuthProvider,
    redirectTo: string,
  ): Promise<Result<OAuthAuthorization, ServerError>>

  /**
   * ログイン中ユーザーのログイン手段一覧を取得する（要認証セッション）
   */
  listIdentities(): Promise<Result<LinkedIdentity[], ServerError>>

  /**
   * ログイン中ユーザーからOAuth連携を解除する（要認証セッション）
   */
  unlinkIdentity(provider: OAuthProvider): Promise<Result<void, ClientError | ServerError>>
}
