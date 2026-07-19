import { ClientError, ServerError } from '@trend-diary/common/errors'
import { err, ok } from 'neverthrow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import type { Command, Notifier, Query } from './repository'
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

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toEqual(mockActiveUser)
        }
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
          err(new ServerError('create failed')),
        )

        const result = await useCase.registerActiveUser(
          'test@example.com',
          'auth-user-id-123',
          notifierMock,
        )

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('resolveActiveUser', () => {
    describe('正常系', () => {
      it('認証IDからアクティブユーザーを解決して返す', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        const result = await useCase.resolveActiveUser('auth-user-id-123')

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toEqual(mockActiveUser)
        }
      })
    })

    describe('準正常系', () => {
      it('アクティブユーザーが存在しない場合はClientError(404)を返す', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(null))

        const result = await useCase.resolveActiveUser('auth-user-id-123')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) {
            expect(result.error.statusCode).toBe(404)
          }
        }
      })
    })

    describe('異常系', () => {
      it('クエリが失敗した場合はServerErrorを返す', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(err(new Error('db down')))

        const result = await useCase.resolveActiveUser('auth-user-id-123')

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })

  describe('resolveOrRegisterActiveUser', () => {
    describe('正常系', () => {
      it('認証IDに紐づく既存ユーザーが見つかればそのまま返し新規作成しない', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        const result = await useCase.resolveOrRegisterActiveUser(
          'auth-user-id-123',
          'test@example.com',
          notifierMock,
        )

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toEqual(mockActiveUser)
        }
        expect(commandMock.createActiveWithAuthenticationId).not.toHaveBeenCalled()
      })

      it('既存ユーザーが無ければ初回ログインとして新規作成して返す', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(null))
        commandMock.createActiveWithAuthenticationId.mockResolvedValue(ok(mockActiveUser))

        const result = await useCase.resolveOrRegisterActiveUser(
          'auth-user-id-123',
          'test@example.com',
          notifierMock,
        )

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toEqual(mockActiveUser)
        }
        expect(commandMock.createActiveWithAuthenticationId).toHaveBeenCalledWith(
          'test@example.com',
          'auth-user-id-123',
          notifierMock,
        )
      })
    })

    describe('準正常系', () => {
      it('既存ユーザーが無くemail未取得なら新規作成せずClientErrorを返す', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(null))

        const result = await useCase.resolveOrRegisterActiveUser(
          'auth-user-id-123',
          undefined,
          notifierMock,
        )

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) {
            expect(result.error.statusCode).toBe(400)
          }
        }
        expect(commandMock.createActiveWithAuthenticationId).not.toHaveBeenCalled()
      })
    })

    describe('異常系', () => {
      it('ユーザー検索が失敗した場合はServerErrorを返し新規作成しない', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(err(new Error('db down')))

        const result = await useCase.resolveOrRegisterActiveUser(
          'auth-user-id-123',
          'test@example.com',
          notifierMock,
        )

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
        expect(commandMock.createActiveWithAuthenticationId).not.toHaveBeenCalled()
      })

      it('新規作成が失敗した場合はServerErrorを返す', async () => {
        queryMock.findActiveByAuthenticationId.mockResolvedValue(ok(null))
        commandMock.createActiveWithAuthenticationId.mockResolvedValue(
          err(new ServerError('create failed')),
        )

        const result = await useCase.resolveOrRegisterActiveUser(
          'auth-user-id-123',
          'test@example.com',
          notifierMock,
        )

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
        }
      })
    })
  })
})
