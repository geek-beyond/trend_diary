import { err, ok } from 'neverthrow'
import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AccountRepositoryError, ActiveUserNotFoundError } from './error'
import type { Command, Notifier, Query } from './port'
import type { CurrentUser } from './schema/active-user-schema'
import { AccountUseCase } from './use-case'

const commandMock = mockDeep<Command>()
const queryMock = mockDeep<Query>()
const notifierMock = mockDeep<Notifier>()

const mockActiveUser: CurrentUser = {
  activeUserId: 1n,
  userId: 2n,
  email: 'test@example.com',
  displayName: 'テストユーザー',
  authenticationId: 'auth-user-id-123',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('AccountUseCase', () => {
  const useCase = new AccountUseCase(commandMock, queryMock)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('registerActiveUser', () => {
    describe('正常系', () => {
      it('認証IDに紐づくアクティブユーザーを作成して返す', async () => {
        commandMock.createActiveWithAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        const result = await useCase.registerActiveUser(
          'test@example.com',
          'auth-user-id-123',
          notifierMock,
        )

        assert(result.isOk())
        expect(result.value).toEqual(mockActiveUser)
        expect(commandMock.createActiveWithAuthenticationId).toHaveBeenCalledWith(
          'test@example.com',
          'auth-user-id-123',
          notifierMock,
          undefined,
        )
      })
    })

    describe('異常系', () => {
      it('アクティブユーザー作成が失敗した場合はエラーを返す', async () => {
        commandMock.createActiveWithAuthenticationId.mockResolvedValue(
          err(new AccountRepositoryError('create failed')),
        )

        const result = await useCase.registerActiveUser(
          'test@example.com',
          'auth-user-id-123',
          notifierMock,
        )

        assert(result.isErr())
        expect(result.error).toBeInstanceOf(AccountRepositoryError)
      })
    })
  })

  describe('resolveActiveUser', () => {
    describe('正常系', () => {
      it('認証IDからアクティブユーザーを解決して返す', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        const result = await useCase.resolveActiveUser('auth-user-id-123')

        assert(result.isOk())
        expect(result.value).toEqual(mockActiveUser)
      })
    })

    describe('準正常系', () => {
      it('アクティブユーザーが存在しない場合は ActiveUserNotFoundError を返す', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(null))

        const result = await useCase.resolveActiveUser('auth-user-id-123')

        assert(result.isErr())
        expect(result.error).toBeInstanceOf(ActiveUserNotFoundError)
      })
    })

    describe('異常系', () => {
      it('クエリが失敗した場合はエラーを返す', async () => {
        const cause = new Error('db down')
        const error = new AccountRepositoryError(cause)
        queryMock.findActiveByAuthenticationId.mockResolvedValue(err(error))

        const result = await useCase.resolveActiveUser('auth-user-id-123')

        assert(result.isErr())
        expect(result.error).toBe(error)
        expect(error.cause).toBe(cause)
      })
    })
  })
})
