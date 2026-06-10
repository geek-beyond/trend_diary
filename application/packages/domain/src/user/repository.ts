import { ClientError, ServerError } from '@trend-diary/common/errors'
import { Nullable } from '@trend-diary/common/types/utility'
import { type Result } from 'neverthrow'

import type { CurrentUser } from './schema/active-user-schema'
import { AuthenticationSession, AuthenticationUser } from './schema/auth-schema'

export interface Query {
  findActiveById(id: bigint): Promise<Result<Nullable<CurrentUser>, Error>>
  findActiveByEmail(email: string): Promise<Result<Nullable<CurrentUser>, Error>>
  findActiveByAuthenticationId(
    authenticationId: string,
  ): Promise<Result<Nullable<CurrentUser>, Error>>
}

/**
 * 手動対応が必要な事象（サインアップ補償失敗によるusersレコードの孤立等）を通知する汎用ポート
 */
export interface Notifier {
  sendMessage(content: string): Promise<void>
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
   * 現在のユーザーを取得する
   */
  getCurrentUser(): Promise<Result<AuthenticationUser, ServerError>>

  /**
   * セッションを更新する
   */
  refreshSession(): Promise<Result<AuthLoginResult, ServerError>>

  /**
   * ユーザーを削除する（補償トランザクション用）
   */
  deleteUser(userId: string): Promise<Result<void, ServerError>>
}
