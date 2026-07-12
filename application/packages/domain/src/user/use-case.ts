import { ClientError, ServerError } from '@trend-diary/common/errors'
import { err, ok, type Result } from 'neverthrow'
import type { AuthRepository, CaptchaVerifier, Command, Notifier, Query } from './repository'
import type { CurrentUser } from './schema/active-user-schema'
import type {
  AuthenticationSession,
  PasskeyChallenge,
  PasskeyRegistrationResult,
  PasskeyVerifyInput,
} from './schema/auth-schema'
import type { Theme } from './schema/theme-schema'

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
    private readonly captchaVerifier: CaptchaVerifier,
  ) {}

  async signup(
    email: string,
    password: string,
    notifier: Notifier,
    captchaToken?: string,
  ): Promise<Result<SignupResult, ClientError | ServerError>> {
    const captchaResult = await this.captchaVerifier.verify(captchaToken)
    if (captchaResult.isErr()) return err(captchaResult.error)

    const authResult = await this.repository.signup(email, password)
    if (authResult.isErr()) return err(authResult.error)

    const { user, session } = authResult.value

    const activeUserResult = await this.userCommand.createActiveWithAuthenticationId(
      user.email,
      user.id,
      notifier,
    )

    if (activeUserResult.isErr()) {
      // NOTE: ここで認証ユーザーは作成済みだがactive_user作成に失敗しており、
      // 認証側に孤児ユーザーが残る。同期補償(認証ユーザーの削除)はSupabaseの
      // 管理者権限(service_role)を要するが、サインアップ経路(anonクライアント)に
      // admin権限を持たせるべきではないため同期補償は行わない。対応候補は、
      // service_roleを持つ別cronでactive_user未紐付けの認証ユーザーを定期
      // クリーンアップするなど。別イシューで再設計する。
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
    captchaToken?: string,
  ): Promise<Result<LoginResult, ClientError | ServerError>> {
    const captchaResult = await this.captchaVerifier.verify(captchaToken)
    if (captchaResult.isErr()) return err(captchaResult.error)

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
    const sessionResult = await this.repository.verifySession()
    if (sessionResult.isErr()) {
      return err(sessionResult.error)
    }

    return this.findActiveUserByAuthenticationId(sessionResult.value.authenticationId)
  }

  // 呼び出し側(authenticatorミドルウェア)でセッション検証済みのactiveUserIdを受け取る。
  // ここで再度セッション検証すると、トークン期限切れ時にリフレッシュが二重に走り得るため行わない
  async updateTheme(
    activeUserId: bigint,
    theme: Theme,
  ): Promise<Result<CurrentUser, ClientError | ServerError>> {
    return this.userCommand.updateTheme(activeUserId, theme)
  }

  async startPasskeyRegistration(): Promise<Result<PasskeyChallenge, ServerError>> {
    return this.repository.startPasskeyRegistration()
  }

  async verifyPasskeyRegistration(
    input: PasskeyVerifyInput,
  ): Promise<Result<PasskeyRegistrationResult, ClientError | ServerError>> {
    return this.repository.verifyPasskeyRegistration(input)
  }

  async startPasskeyLogin(): Promise<Result<PasskeyChallenge, ClientError | ServerError>> {
    return this.repository.startPasskeyAuthentication()
  }

  async hasRegisteredPasskey(): Promise<Result<boolean, ServerError>> {
    const result = await this.repository.listPasskeys()
    if (result.isErr()) return err(result.error)

    return ok(result.value.length > 0)
  }

  async disablePasskeys(): Promise<Result<void, ServerError>> {
    const listResult = await this.repository.listPasskeys()
    if (listResult.isErr()) return err(listResult.error)

    // トグルOFFは「パスキーを使わない」状態にすることなので、登録済みを全て削除する
    for (const passkey of listResult.value) {
      const deleteResult = await this.repository.deletePasskey(passkey.id)
      if (deleteResult.isErr()) return err(deleteResult.error)
    }

    return ok(undefined)
  }

  async verifyPasskeyLogin(
    input: PasskeyVerifyInput,
  ): Promise<Result<LoginResult, ClientError | ServerError>> {
    const authResult = await this.repository.verifyPasskeyAuthentication(input)
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
