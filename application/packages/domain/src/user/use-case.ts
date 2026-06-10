import { ClientError, ExternalServiceError, ServerError } from '@trend-diary/common/errors'
import { err, ok, type Result } from 'neverthrow'
import type { AuthRepository, Command, Query } from './repository'
import type { CurrentUser } from './schema/active-user-schema'
import type { AuthenticationSession } from './schema/auth-schema'

/**
 * サインアップ結果
 */
export interface SignupResult {
  session: AuthenticationSession | null
  activeUser: CurrentUser
}

/**
 * ログイン結果
 */
export interface LoginResult {
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
  ): Promise<Result<SignupResult, ClientError | ServerError>> {
    // 認証でユーザー作成
    const authResult = await this.repository.signup(email, password)
    if (authResult.isErr()) return err(authResult.error)

    const { user, session } = authResult.value

    // active_userを作成
    const activeUserResult = await this.userCommand.createActiveWithAuthenticationId(
      user.email,
      user.id,
    )

    if (activeUserResult.isErr()) {
      // active_user作成に失敗したら、認証側に残った孤児ユーザーを補償削除する
      // NOTE: deleteUserはSupabaseの管理者権限(service_role)を要するため、本来
      // リクエスト経路で同期的に呼ぶには重い。孤児の蓄積を防ぐ暫定対応として
      // 同期補償を残すが、長期的には非同期クリーンアップ(cron等)への再設計が必要。
      const deleteResult = await this.repository.deleteUser(user.id)

      // 補償削除まで失敗すると認証側に不整合が残るため、元エラーと削除エラーを束ねて返す
      if (deleteResult.isErr()) {
        return err(
          new ExternalServiceError(
            'Failed to delete Supabase Auth user during compensation',
            activeUserResult.error,
            deleteResult.error,
            { authenticationId: user.id },
          ),
        )
      }

      return err(activeUserResult.error)
    }

    return ok({
      session,
      activeUser: activeUserResult.value,
    })
  }

  async login(
    email: string,
    password: string,
  ): Promise<Result<LoginResult, ClientError | ServerError>> {
    // 認証でログイン
    const authResult = await this.repository.login(email, password)
    if (authResult.isErr()) return err(authResult.error)

    const { user, session } = authResult.value

    const activeUserResult = await this.findActiveUserByAuthenticationId(user.id)

    if (activeUserResult.isErr()) return err(activeUserResult.error)

    return ok({
      session,
      activeUser: activeUserResult.value,
    })
  }

  async logout(): Promise<Result<void, ServerError>> {
    return this.repository.logout()
  }

  async getCurrentActiveUser(): Promise<Result<CurrentUser, ClientError | ServerError>> {
    const authUserResult = await this.repository.getCurrentUser()
    if (authUserResult.isErr()) {
      return err(authUserResult.error)
    }

    return this.findActiveUserByAuthenticationId(authUserResult.value.id)
  }

  async refreshSession(): Promise<Result<LoginResult, ClientError | ServerError>> {
    // 認証でセッション更新
    const authResult = await this.repository.refreshSession()
    if (authResult.isErr()) return err(authResult.error)

    const { user, session } = authResult.value

    const activeUserResult = await this.findActiveUserByAuthenticationId(user.id)

    if (activeUserResult.isErr()) return err(activeUserResult.error)

    return ok({
      session,
      activeUser: activeUserResult.value,
    })
  }

  private async findActiveUserByAuthenticationId(
    authenticationId: string,
  ): Promise<Result<CurrentUser, ClientError | ServerError>> {
    const activeUserResult = await this.userQuery.findActiveByAuthenticationId(authenticationId)

    if (activeUserResult.isErr()) {
      return err(new ServerError(activeUserResult.error))
    }

    if (!activeUserResult.value) {
      return err(new ClientError('User not found', 404))
    }

    return ok(activeUserResult.value)
  }
}
