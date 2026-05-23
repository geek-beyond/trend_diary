import { ClientError, ServerError } from '@/common/errors'
import { type AsyncResult, failure, isFailure, success } from '@/common/result'
import type { Command, Query } from '@/domain/user/repository'
import type { CurrentUser } from '@/domain/user/schema/active-user-schema'
import type { AuthRepository } from './repository'
import type { AuthenticationSession } from './schema/auth-schema'

/**
 * サインアップ結果
 */
export type SignupResult = {
  session: AuthenticationSession | null
  activeUser: CurrentUser
}

/**
 * ログイン結果
 */
export type LoginResult = {
  session: AuthenticationSession
  activeUser: CurrentUser
}

export class AuthUseCase {
  constructor(
    private readonly repository: AuthRepository,
    private readonly userCommand: Command,
    private readonly userQuery: Query,
  ) {}

  async signup(
    email: string,
    password: string,
  ): AsyncResult<SignupResult, ClientError | ServerError> {
    // 認証でユーザー作成
    const authResult = await this.repository.signup(email, password)
    if (isFailure(authResult)) return authResult

    const { user, session } = authResult.data

    // active_userを作成
    const activeUserResult = await this.userCommand.createActiveWithAuthenticationId(
      user.email,
      user.id,
    )

    if (isFailure(activeUserResult)) {
      // Supabase Admin Roleが必要でエラーになるので、コメントアウト
      // // 補償トランザクション: Supabase Authで作成したユーザーを削除
      // const deleteResult = await this.repository.deleteUser(user.id)
      // if (isFailure(deleteResult)) {
      //   // 補償トランザクション失敗時はExternalServiceErrorを返す
      //   return failure(
      //     new ExternalServiceError(
      //       'Failed to delete Supabase Auth user during compensation',
      //       activeUserResult.error,
      //       deleteResult.error,
      //       { userId: user.id },
      //     ),
      //   )
      // }
      return failure(activeUserResult.error)
    }

    return success({
      session,
      activeUser: activeUserResult.data,
    })
  }

  async login(
    email: string,
    password: string,
  ): AsyncResult<LoginResult, ClientError | ServerError> {
    // 認証でログイン
    const authResult = await this.repository.login(email, password)
    if (isFailure(authResult)) return authResult

    const { user, session } = authResult.data

    const activeUserResult = await this.findActiveUserByAuthenticationId(user.id)

    if (isFailure(activeUserResult)) return activeUserResult

    return success({
      session,
      activeUser: activeUserResult.data,
    })
  }

  async logout(): AsyncResult<void, ServerError> {
    return this.repository.logout()
  }

  async getCurrentActiveUser(): AsyncResult<CurrentUser, ClientError | ServerError> {
    const authUserResult = await this.repository.getCurrentUser()
    if (isFailure(authUserResult)) {
      return authUserResult
    }

    return this.findActiveUserByAuthenticationId(authUserResult.data.id)
  }

  async refreshSession(): AsyncResult<LoginResult, ClientError | ServerError> {
    // 認証でセッション更新
    const authResult = await this.repository.refreshSession()
    if (isFailure(authResult)) return authResult

    const { user, session } = authResult.data

    const activeUserResult = await this.findActiveUserByAuthenticationId(user.id)

    if (isFailure(activeUserResult)) return activeUserResult

    return success({
      session,
      activeUser: activeUserResult.data,
    })
  }

  private async findActiveUserByAuthenticationId(
    authenticationId: string,
  ): AsyncResult<CurrentUser, ClientError | ServerError> {
    const activeUserResult = await this.userQuery.findActiveByAuthenticationId(authenticationId)

    if (isFailure(activeUserResult)) {
      return failure(new ServerError(activeUserResult.error))
    }

    if (!activeUserResult.data) {
      return failure(new ClientError('User not found', 404))
    }

    return success(activeUserResult.data)
  }
}
