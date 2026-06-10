import { ClientError, ServerError } from '@trend-diary/common/errors'
import { err, ok, type Result } from 'neverthrow'
import type { AuthRepository, Command, Notifier, Query } from './repository'
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
    notifier: Notifier,
  ): Promise<Result<SignupResult, ClientError | ServerError>> {
    // 認証でユーザー作成
    const authResult = await this.repository.signup(email, password)
    if (authResult.isErr()) return err(authResult.error)

    const { user, session } = authResult.value

    // active_userを作成（補償失敗でusersレコードが孤立した場合はnotifierで通知する）
    const activeUserResult = await this.userCommand.createActiveWithAuthenticationId(
      user.email,
      user.id,
      notifier,
    )

    if (activeUserResult.isErr()) {
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
