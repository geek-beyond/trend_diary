import { ClientError, ServerError } from '@/common/errors'
import { AsyncResult } from '@/common/result'
import { Nullable } from '@/common/types/utility'

import type { CurrentUser } from './schema/active-user-schema'
import { AuthenticationSession, AuthenticationUser } from './schema/auth-schema'

export interface Query {
  findActiveById(id: bigint): AsyncResult<Nullable<CurrentUser>, Error>
  findActiveByEmail(email: string): AsyncResult<Nullable<CurrentUser>, Error>
  findActiveByAuthenticationId(authenticationId: string): AsyncResult<Nullable<CurrentUser>, Error>
}

export interface Command {
  createActiveWithAuthenticationId(
    email: string,
    authenticationId: string,
    displayName?: string | null,
  ): AsyncResult<CurrentUser, ServerError>
}

/**
 * 認証のサインアップ結果
 */
export type AuthSignupResult = {
  user: AuthenticationUser
  session: AuthenticationSession | null
}

/**
 * 認証のログイン結果
 */
export type AuthLoginResult = {
  user: AuthenticationUser
  session: AuthenticationSession
}

export interface AuthRepository {
  /**
   * ユーザーを作成する
   */
  signup(email: string, password: string): AsyncResult<AuthSignupResult, ClientError | ServerError>

  /**
   * ログインする
   */
  login(email: string, password: string): AsyncResult<AuthLoginResult, ClientError | ServerError>

  /**
   * ログアウトする
   */
  logout(): AsyncResult<void, ServerError>

  /**
   * 現在のユーザーを取得する
   */
  getCurrentUser(): AsyncResult<AuthenticationUser, ServerError>

  /**
   * セッションを更新する
   */
  refreshSession(): AsyncResult<AuthLoginResult, ServerError>

  /**
   * ユーザーを削除する（補償トランザクション用）
   */
  deleteUser(userId: string): AsyncResult<void, ServerError>
}
