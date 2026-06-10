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

export interface Command {
  createActiveWithAuthenticationId(
    email: string,
    authenticationId: string,
    displayName?: string | null,
  ): Promise<Result<CurrentUser, ServerError>>
}

/**
 * サインアップ補償（users削除）失敗で残った孤児userを手動対応のために通知するポート
 */
export interface OrphanedUserNotifier {
  orphanedUser(userId: number, error: Error): Promise<void>
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
