import { ClientError, ServerError } from '@trend-diary/common/errors'
import { err, ok } from 'neverthrow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import type { AuthRepository, CaptchaVerifier, Command, Notifier, Query } from './repository'
import type { CurrentUser } from './schema/active-user-schema'
import type {
  AuthenticationSession,
  AuthenticationUser,
  PasskeyChallenge,
  PasskeyVerifyInput,
  VerifiedSession,
} from './schema/auth-schema'
import { AuthUseCase } from './use-case'

const repositoryMock = mockDeep<AuthRepository>()
const commandMock = mockDeep<Command>()
const queryMock = mockDeep<Query>()
const notifierMock = mockDeep<Notifier>()
const captchaVerifierMock = mockDeep<CaptchaVerifier>()

const mockAuthUser: AuthenticationUser = {
  id: 'auth-user-id-123',
  email: 'test@example.com',
  emailConfirmedAt: new Date(),
  createdAt: new Date(),
}

const mockVerifiedSession: VerifiedSession = {
  authenticationId: 'auth-user-id-123',
}

const mockSession: AuthenticationSession = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-123',
  expiresIn: 3600,
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  user: mockAuthUser,
}

const mockActiveUser: CurrentUser = {
  activeUserId: 1n,
  userId: 2n,
  email: 'test@example.com',
  displayName: 'テストユーザー',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockChallenge: PasskeyChallenge = {
  challengeId: 'challenge-id-123',
  options: { challenge: 'random-challenge' },
}

const mockVerifyInput: PasskeyVerifyInput = {
  challengeId: 'challenge-id-123',
  credential: { id: 'credential-id', type: 'public-key' },
}

describe('AuthUseCase', () => {
  const useCase = new AuthUseCase(repositoryMock, commandMock, queryMock, captchaVerifierMock)

  beforeEach(() => {
    vi.clearAllMocks()
    // 既定ではCAPTCHA検証を通過させる
    captchaVerifierMock.verify.mockResolvedValue(ok(undefined))
  })

  describe('signup', () => {
    describe('正常系', () => {
      it('サインアップ成功時、sessionとactiveUserを返す', async () => {
        // Arrange
        repositoryMock.signup.mockResolvedValue(
          ok({
            user: mockAuthUser,
            session: mockSession,
          }),
        )
        commandMock.createActiveWithAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        // Act
        const result = await useCase.signup('test@example.com', 'Password1!', notifierMock)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.session).toEqual(mockSession)
          expect(result.value.activeUser).toEqual(mockActiveUser)
        }
        expect(repositoryMock.signup).toHaveBeenCalledWith('test@example.com', 'Password1!')
        expect(commandMock.createActiveWithAuthenticationId).toHaveBeenCalledWith(
          mockAuthUser.email,
          mockAuthUser.id,
          notifierMock,
        )
      })

      it('captchaTokenをcaptchaVerifierで検証する', async () => {
        // Arrange
        repositoryMock.signup.mockResolvedValue(
          ok({
            user: mockAuthUser,
            session: mockSession,
          }),
        )
        commandMock.createActiveWithAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        // Act
        await useCase.signup('test@example.com', 'Password1!', notifierMock, 'captcha-token')

        // Assert
        expect(captchaVerifierMock.verify).toHaveBeenCalledWith('captcha-token')
      })
    })

    describe('異常系', () => {
      it('CAPTCHA検証失敗時、エラーを返しsignupを呼ばない', async () => {
        // Arrange
        const captchaError = new ClientError('captcha verification failed', 403)
        captchaVerifierMock.verify.mockResolvedValue(err(captchaError))

        // Act
        const result = await useCase.signup('test@example.com', 'Password1!', notifierMock, 'bad')

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(captchaError)
        }
        expect(repositoryMock.signup).not.toHaveBeenCalled()
      })

      it('repository.signup失敗時、エラーを返す', async () => {
        // Arrange
        const authError = new ClientError('Invalid credentials', 400)
        repositoryMock.signup.mockResolvedValue(err(authError))

        // Act
        const result = await useCase.signup('test@example.com', 'Password1!', notifierMock)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(authError)
        }
        expect(commandMock.createActiveWithAuthenticationId).not.toHaveBeenCalled()
      })

      // NOTE: active_user作成失敗時の孤児認証ユーザーの補償は、admin権限を要する
      // deleteUserが必要だが、サインアップ経路(anonクライアント)にadmin権限を
      // 持たせるべきではないため未実装。仕様・対応候補はuse-case.ts側のコメントに
      // 記載し、別イシューで再設計する。
    })
  })

  describe('login', () => {
    describe('正常系', () => {
      it('ログイン成功時、sessionとactiveUserを返す', async () => {
        // Arrange
        repositoryMock.login.mockResolvedValue(
          ok({
            user: mockAuthUser,
            session: mockSession,
          }),
        )
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        // Act
        const result = await useCase.login('test@example.com', 'Password1!')

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.session).toEqual(mockSession)
          expect(result.value.activeUser).toEqual(mockActiveUser)
        }
        expect(repositoryMock.login).toHaveBeenCalledWith('test@example.com', 'Password1!')
        expect(queryMock.findActiveByAuthenticationId).toHaveBeenCalledWith(mockAuthUser.id)
      })

      it('captchaTokenをcaptchaVerifierで検証する', async () => {
        // Arrange
        repositoryMock.login.mockResolvedValue(
          ok({
            user: mockAuthUser,
            session: mockSession,
          }),
        )
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        // Act
        await useCase.login('test@example.com', 'Password1!', 'captcha-token')

        // Assert
        expect(captchaVerifierMock.verify).toHaveBeenCalledWith('captcha-token')
      })
    })

    describe('異常系', () => {
      it('CAPTCHA検証失敗時、エラーを返しloginを呼ばない', async () => {
        // Arrange
        const captchaError = new ClientError('captcha verification failed', 403)
        captchaVerifierMock.verify.mockResolvedValue(err(captchaError))

        // Act
        const result = await useCase.login('test@example.com', 'Password1!', 'bad')

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(captchaError)
        }
        expect(repositoryMock.login).not.toHaveBeenCalled()
      })

      it('repository.login失敗時、エラーを返す', async () => {
        // Arrange
        const authError = new ClientError('Invalid credentials', 401)
        repositoryMock.login.mockResolvedValue(err(authError))

        // Act
        const result = await useCase.login('test@example.com', 'WrongPassword!')

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(authError)
        }
        expect(queryMock.findActiveByAuthenticationId).not.toHaveBeenCalled()
      })

      describe('認証成功後', () => {
        beforeEach(() => {
          repositoryMock.login.mockResolvedValue(
            ok({
              user: mockAuthUser,
              session: mockSession,
            }),
          )
        })

        it('ActiveUserが見つからない場合、ClientError(404)を返す', async () => {
          // Arrange
          queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(null))

          // Act
          const result = await useCase.login('test@example.com', 'Password1!')

          // Assert
          expect(result.isErr()).toBe(true)
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ClientError)
            expect(result.error.message).toBe('User not found')
          }
        })

        it('クエリ失敗時、ServerErrorを返す', async () => {
          // Arrange
          const dbError = new Error('Database connection failed')
          queryMock.findActiveByAuthenticationId.mockResolvedValue(err(dbError))

          // Act
          const result = await useCase.login('test@example.com', 'Password1!')

          // Assert
          expect(result.isErr()).toBe(true)
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ServerError)
          }
        })
      })
    })
  })

  describe('logout', () => {
    describe('正常系', () => {
      it('ログアウト成功時、voidを返す', async () => {
        // Arrange
        repositoryMock.logout.mockResolvedValue(ok(undefined))

        // Act
        const result = await useCase.logout()

        // Assert
        expect(result.isOk()).toBe(true)
        expect(repositoryMock.logout).toHaveBeenCalled()
      })
    })

    describe('異常系', () => {
      it('repository.logout失敗時、ServerErrorを返す', async () => {
        // Arrange
        const serverError = new ServerError('Logout failed')
        repositoryMock.logout.mockResolvedValue(err(serverError))

        // Act
        const result = await useCase.logout()

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(serverError)
        }
      })
    })
  })

  describe('getCurrentActiveUser', () => {
    describe('正常系', () => {
      it('検証済みセッションからactiveUserを取得して返す', async () => {
        // Arrange
        repositoryMock.verifySession.mockResolvedValue(ok(mockVerifiedSession))
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        // Act
        const result = await useCase.getCurrentActiveUser()

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toEqual(mockActiveUser)
        }
        expect(repositoryMock.verifySession).toHaveBeenCalled()
        expect(queryMock.findActiveByAuthenticationId).toHaveBeenCalledWith(
          mockVerifiedSession.authenticationId,
        )
      })
    })

    describe('異常系', () => {
      it('repository.verifySession失敗時、エラーを返す', async () => {
        // Arrange
        const authError = new ClientError('Not authenticated', 401)
        repositoryMock.verifySession.mockResolvedValue(err(authError))

        // Act
        const result = await useCase.getCurrentActiveUser()

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(authError)
        }
        expect(queryMock.findActiveByAuthenticationId).not.toHaveBeenCalled()
      })

      describe('認証成功後', () => {
        beforeEach(() => {
          repositoryMock.verifySession.mockResolvedValue(ok(mockVerifiedSession))
        })

        it('ActiveUserが見つからない場合、ClientError(404)を返す', async () => {
          // Arrange
          queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(null))

          // Act
          const result = await useCase.getCurrentActiveUser()

          // Assert
          expect(result.isErr()).toBe(true)
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ClientError)
            expect(result.error.message).toBe('User not found')
          }
        })

        it('クエリ失敗時、ServerErrorを返す', async () => {
          // Arrange
          const dbError = new Error('Database connection failed')
          queryMock.findActiveByAuthenticationId.mockResolvedValue(err(dbError))

          // Act
          const result = await useCase.getCurrentActiveUser()

          // Assert
          expect(result.isErr()).toBe(true)
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ServerError)
          }
        })
      })
    })
  })

  describe('refreshSession', () => {
    describe('正常系', () => {
      it('セッション更新成功時、新しいsessionとactiveUserを返す', async () => {
        // Arrange
        const newSession: AuthenticationSession = {
          ...mockSession,
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }
        repositoryMock.refreshSession.mockResolvedValue(
          ok({
            user: mockAuthUser,
            session: newSession,
          }),
        )
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        // Act
        const result = await useCase.refreshSession()

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.session).toEqual(newSession)
          expect(result.value.activeUser).toEqual(mockActiveUser)
        }
        expect(repositoryMock.refreshSession).toHaveBeenCalled()
        expect(queryMock.findActiveByAuthenticationId).toHaveBeenCalledWith(mockAuthUser.id)
      })
    })

    describe('異常系', () => {
      it('repository.refreshSession失敗時、エラーを返す', async () => {
        // Arrange
        const authError = new ClientError('Session expired', 401)
        repositoryMock.refreshSession.mockResolvedValue(err(authError))

        // Act
        const result = await useCase.refreshSession()

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(authError)
        }
        expect(queryMock.findActiveByAuthenticationId).not.toHaveBeenCalled()
      })

      describe('認証成功後', () => {
        beforeEach(() => {
          repositoryMock.refreshSession.mockResolvedValue(
            ok({
              user: mockAuthUser,
              session: mockSession,
            }),
          )
        })

        it('ActiveUserが見つからない場合、ClientError(404)を返す', async () => {
          // Arrange
          queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(null))

          // Act
          const result = await useCase.refreshSession()

          // Assert
          expect(result.isErr()).toBe(true)
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ClientError)
            expect(result.error.message).toBe('User not found')
          }
        })

        it('クエリ失敗時、ServerErrorを返す', async () => {
          // Arrange
          const dbError = new Error('Database connection failed')
          queryMock.findActiveByAuthenticationId.mockResolvedValue(err(dbError))

          // Act
          const result = await useCase.refreshSession()

          // Assert
          expect(result.isErr()).toBe(true)
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ServerError)
          }
        })
      })
    })
  })

  describe('startPasskeyRegistration', () => {
    describe('正常系', () => {
      it('repositoryのチャレンジをそのまま返す', async () => {
        // Arrange
        repositoryMock.startPasskeyRegistration.mockResolvedValue(ok(mockChallenge))

        // Act
        const result = await useCase.startPasskeyRegistration()

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toEqual(mockChallenge)
        }
      })
    })

    describe('異常系', () => {
      it('repository失敗時、ServerErrorを返す', async () => {
        // Arrange
        const serverError = new ServerError('start failed')
        repositoryMock.startPasskeyRegistration.mockResolvedValue(err(serverError))

        // Act
        const result = await useCase.startPasskeyRegistration()

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(serverError)
        }
      })
    })
  })

  describe('verifyPasskeyRegistration', () => {
    describe('正常系', () => {
      it('登録結果を返す', async () => {
        // Arrange
        repositoryMock.verifyPasskeyRegistration.mockResolvedValue(ok({ id: 'passkey-1' }))

        // Act
        const result = await useCase.verifyPasskeyRegistration(mockVerifyInput)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.id).toBe('passkey-1')
        }
        expect(repositoryMock.verifyPasskeyRegistration).toHaveBeenCalledWith(mockVerifyInput)
      })
    })

    describe('準正常系', () => {
      it('資格情報が不正な場合、ClientErrorを返す', async () => {
        // Arrange
        const clientError = new ClientError('Passkey registration failed', 400)
        repositoryMock.verifyPasskeyRegistration.mockResolvedValue(err(clientError))

        // Act
        const result = await useCase.verifyPasskeyRegistration(mockVerifyInput)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(clientError)
        }
      })
    })
  })

  describe('startPasskeyLogin', () => {
    describe('正常系', () => {
      it('repositoryのチャレンジをそのまま返す', async () => {
        // Arrange
        repositoryMock.startPasskeyAuthentication.mockResolvedValue(ok(mockChallenge))

        // Act
        const result = await useCase.startPasskeyLogin()

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toEqual(mockChallenge)
        }
      })
    })

    describe('異常系', () => {
      it('repository失敗時、エラーを返す', async () => {
        // Arrange
        const serverError = new ServerError('start failed')
        repositoryMock.startPasskeyAuthentication.mockResolvedValue(err(serverError))

        // Act
        const result = await useCase.startPasskeyLogin()

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(serverError)
        }
      })
    })
  })

  describe('verifyPasskeyLogin', () => {
    describe('正常系', () => {
      it('認証成功時、sessionとactiveUserを返す', async () => {
        // Arrange
        repositoryMock.verifyPasskeyAuthentication.mockResolvedValue(
          ok({ user: mockAuthUser, session: mockSession }),
        )
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        // Act
        const result = await useCase.verifyPasskeyLogin(mockVerifyInput)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.session).toEqual(mockSession)
          expect(result.value.activeUser).toEqual(mockActiveUser)
        }
        expect(queryMock.findActiveByAuthenticationId).toHaveBeenCalledWith(mockAuthUser.id)
      })
    })

    describe('準正常系', () => {
      it('認証失敗時、エラーを返しactiveUserを引かない', async () => {
        // Arrange
        const clientError = new ClientError('Invalid passkey', 401)
        repositoryMock.verifyPasskeyAuthentication.mockResolvedValue(err(clientError))

        // Act
        const result = await useCase.verifyPasskeyLogin(mockVerifyInput)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(clientError)
        }
        expect(queryMock.findActiveByAuthenticationId).not.toHaveBeenCalled()
      })

      it('ActiveUserが見つからない場合、ClientError(404)を返す', async () => {
        // Arrange
        repositoryMock.verifyPasskeyAuthentication.mockResolvedValue(
          ok({ user: mockAuthUser, session: mockSession }),
        )
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(null))

        // Act
        const result = await useCase.verifyPasskeyLogin(mockVerifyInput)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          expect(result.error.message).toBe('User not found')
        }
      })
    })
  })

  describe('hasRegisteredPasskey', () => {
    describe('正常系', () => {
      it.each([
        {
          name: '登録済みが1件以上ならtrueを返す',
          passkeys: [{ id: 'passkey-1' }],
          expected: true,
        },
        { name: '登録が無ければfalseを返す', passkeys: [], expected: false },
      ])('$name', async ({ passkeys, expected }) => {
        repositoryMock.listPasskeys.mockResolvedValue(ok(passkeys))

        const result = await useCase.hasRegisteredPasskey()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toBe(expected)
        }
      })
    })

    describe('異常系', () => {
      it('一覧取得が失敗した場合はエラーを返すこと', async () => {
        const serverError = new ServerError('Passkey list failed')
        repositoryMock.listPasskeys.mockResolvedValue(err(serverError))

        const result = await useCase.hasRegisteredPasskey()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(serverError)
        }
      })
    })
  })

  describe('disablePasskeys', () => {
    describe('正常系', () => {
      it('登録済みpasskeyを全て削除すること', async () => {
        repositoryMock.listPasskeys.mockResolvedValue(
          ok([{ id: 'passkey-1' }, { id: 'passkey-2' }]),
        )
        repositoryMock.deletePasskey.mockResolvedValue(ok(undefined))

        const result = await useCase.disablePasskeys()

        expect(result.isOk()).toBe(true)
        expect(repositoryMock.deletePasskey).toHaveBeenCalledTimes(2)
        expect(repositoryMock.deletePasskey).toHaveBeenCalledWith('passkey-1')
        expect(repositoryMock.deletePasskey).toHaveBeenCalledWith('passkey-2')
      })

      it('登録が無ければ削除を呼ばず成功すること', async () => {
        repositoryMock.listPasskeys.mockResolvedValue(ok([]))

        const result = await useCase.disablePasskeys()

        expect(result.isOk()).toBe(true)
        expect(repositoryMock.deletePasskey).not.toHaveBeenCalled()
      })
    })

    describe('異常系', () => {
      it('一覧取得が失敗した場合はエラーを返すこと', async () => {
        const serverError = new ServerError('Passkey list failed')
        repositoryMock.listPasskeys.mockResolvedValue(err(serverError))

        const result = await useCase.disablePasskeys()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(serverError)
        }
        expect(repositoryMock.deletePasskey).not.toHaveBeenCalled()
      })

      it('削除が失敗した場合はエラーを返すこと', async () => {
        const serverError = new ServerError('Passkey deletion failed')
        repositoryMock.listPasskeys.mockResolvedValue(ok([{ id: 'passkey-1' }]))
        repositoryMock.deletePasskey.mockResolvedValue(err(serverError))

        const result = await useCase.disablePasskeys()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(serverError)
        }
      })
    })
  })
})
