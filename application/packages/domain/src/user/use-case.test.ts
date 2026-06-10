import { ClientError, ExternalServiceError, ServerError } from '@trend-diary/common/errors'
import { err, ok } from 'neverthrow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import type { AuthRepository, Command, Query } from './repository'
import type { CurrentUser } from './schema/active-user-schema'
import type { AuthenticationSession, AuthenticationUser } from './schema/auth-schema'
import { AuthUseCase } from './use-case'

const repositoryMock = mockDeep<AuthRepository>()
const commandMock = mockDeep<Command>()
const queryMock = mockDeep<Query>()

const mockAuthUser: AuthenticationUser = {
  id: 'auth-user-id-123',
  email: 'test@example.com',
  emailConfirmedAt: new Date(),
  createdAt: new Date(),
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

describe('AuthUseCase', () => {
  const useCase = new AuthUseCase(repositoryMock, commandMock, queryMock)

  beforeEach(() => {
    vi.clearAllMocks()
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
        const result = await useCase.signup('test@example.com', 'Password1!')

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
        )
      })
    })

    describe('異常系', () => {
      it('repository.signup失敗時、エラーを返す', async () => {
        // Arrange
        const authError = new ClientError('Invalid credentials', 400)
        repositoryMock.signup.mockResolvedValue(err(authError))

        // Act
        const result = await useCase.signup('test@example.com', 'Password1!')

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBe(authError)
        }
        expect(commandMock.createActiveWithAuthenticationId).not.toHaveBeenCalled()
      })

      describe('認証成功後', () => {
        beforeEach(() => {
          repositoryMock.signup.mockResolvedValue(
            ok({
              user: mockAuthUser,
              session: mockSession,
            }),
          )
        })

        it('ActiveUser作成失敗時、補償トランザクションを実行してエラーを返す', async () => {
          // Arrange
          const dbError = new ServerError('Database error')
          commandMock.createActiveWithAuthenticationId.mockResolvedValue(err(dbError))
          repositoryMock.deleteUser.mockResolvedValue(ok(undefined))

          // Act
          const result = await useCase.signup('test@example.com', 'Password1!')

          // Assert
          expect(result.isErr()).toBe(true)
          if (result.isErr()) {
            expect(result.error).toBe(dbError)
          }
          expect(repositoryMock.deleteUser).toHaveBeenCalledWith(mockAuthUser.id)
        })

        it('補償トランザクション失敗時、ExternalServiceErrorを返す', async () => {
          // Arrange
          const dbError = new ServerError('Database error')
          commandMock.createActiveWithAuthenticationId.mockResolvedValue(err(dbError))
          const deleteError = new ServerError('Delete failed')
          repositoryMock.deleteUser.mockResolvedValue(err(deleteError))

          // Act
          const result = await useCase.signup('test@example.com', 'Password1!')

          // Assert
          expect(result.isErr()).toBe(true)
          if (result.isErr()) {
            expect(result.error).toBeInstanceOf(ExternalServiceError)
            const error = result.error as ExternalServiceError
            expect(error.message).toBe('Failed to delete Supabase Auth user during compensation')
            expect(error.originalError).toBe(dbError)
            expect(error.serviceError).toBe(deleteError)
            expect(error.context).toEqual({ authenticationId: mockAuthUser.id })
          }
        })
      })
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
    })

    describe('異常系', () => {
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
      it('認証ユーザーからactiveUserを取得して返す', async () => {
        // Arrange
        repositoryMock.getCurrentUser.mockResolvedValue(ok(mockAuthUser))
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        // Act
        const result = await useCase.getCurrentActiveUser()

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toEqual(mockActiveUser)
        }
        expect(repositoryMock.getCurrentUser).toHaveBeenCalled()
        expect(queryMock.findActiveByAuthenticationId).toHaveBeenCalledWith(mockAuthUser.id)
      })
    })

    describe('異常系', () => {
      it('repository.getCurrentUser失敗時、エラーを返す', async () => {
        // Arrange
        const authError = new ClientError('Not authenticated', 401)
        repositoryMock.getCurrentUser.mockResolvedValue(err(authError))

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
          repositoryMock.getCurrentUser.mockResolvedValue(ok(mockAuthUser))
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
})
