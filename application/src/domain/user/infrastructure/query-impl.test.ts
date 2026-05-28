import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '@/test/__mocks__/prisma'
import QueryImpl from './query-impl'

describe('QueryImpl', () => {
  let useCase: QueryImpl

  beforeEach(() => {
    vi.clearAllMocks()
    useCase = new QueryImpl(prisma)
  })

  describe('findActiveById', () => {
    describe('基本動作', () => {
      it('ActiveUserをIDで検索できる', async () => {
        // Arrange
        const activeUserId = 1n

        const mockActiveUserData = {
          activeUserId: 1,
          userId: 2,
          email: 'test@example.com',
          displayName: 'テストユーザー',
          authenticationId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        prisma.activeUser.findUnique.mockResolvedValue(mockActiveUserData)

        // Act
        const result = await useCase.findActiveById(activeUserId)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value?.activeUserId).toBe(1n)
          expect(result.value?.email).toBe('test@example.com')
        }
        expect(prisma.activeUser.findUnique).toHaveBeenCalled()
      })
    })

    describe('境界値・特殊値', () => {
      it('存在しないActiveUserの場合nullを返す', async () => {
        // Arrange
        const activeUserId = 999n
        prisma.activeUser.findUnique.mockResolvedValue(null)

        // Act
        const result = await useCase.findActiveById(activeUserId)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toBeNull()
        }
      })
    })

    describe('例外・制約違反', () => {
      it('データベースエラー時は適切にエラーを返す', async () => {
        // Arrange
        const activeUserId = 1n
        const dbError = new Error('Database connection failed')
        prisma.activeUser.findUnique.mockRejectedValue(dbError)

        // Act
        const result = await useCase.findActiveById(activeUserId)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error.message).toBe('Database connection failed')
        }
      })
    })
  })

  describe('findActiveByEmail', () => {
    describe('基本動作', () => {
      it('ActiveUserをメールアドレスで検索できる', async () => {
        // Arrange
        const email = 'test@example.com'

        const mockActiveUserData = {
          activeUserId: 1,
          userId: 2,
          email,
          displayName: 'テストユーザー',
          authenticationId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        prisma.activeUser.findUnique.mockResolvedValue(mockActiveUserData)

        // Act
        const result = await useCase.findActiveByEmail(email)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value?.email).toBe(email)
          expect(result.value?.activeUserId).toBe(1n)
        }
        expect(prisma.activeUser.findUnique).toHaveBeenCalled()
      })
    })

    describe('境界値・特殊値', () => {
      it('存在しないメールアドレスの場合nullを返す', async () => {
        // Arrange
        const email = 'notfound@example.com'
        prisma.activeUser.findUnique.mockResolvedValue(null)

        // Act
        const result = await useCase.findActiveByEmail(email)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toBeNull()
        }
      })
    })

    describe('例外・制約違反', () => {
      it('データベースエラー時は適切にエラーを返す', async () => {
        // Arrange
        const email = 'test@example.com'
        const dbError = new Error('Database connection failed')
        prisma.activeUser.findUnique.mockRejectedValue(dbError)

        // Act
        const result = await useCase.findActiveByEmail(email)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error.message).toBe('Database connection failed')
        }
      })
    })
  })

  describe('findActiveByAuthenticationId', () => {
    describe('基本動作', () => {
      it('ActiveUserを認証IDで検索できる', async () => {
        // Arrange
        const authenticationId = 'auth-id-123'

        const mockActiveUserData = {
          activeUserId: 1,
          userId: 2,
          email: 'test@example.com',
          displayName: 'テストユーザー',
          authenticationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        prisma.activeUser.findUnique.mockResolvedValue(mockActiveUserData)

        // Act
        const result = await useCase.findActiveByAuthenticationId(authenticationId)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value?.activeUserId).toBe(1n)
          expect(result.value?.email).toBe('test@example.com')
        }
        expect(prisma.activeUser.findUnique).toHaveBeenCalledWith({
          where: { authenticationId },
        })
      })
    })

    describe('境界値・特殊値', () => {
      it('存在しない認証IDの場合nullを返す', async () => {
        // Arrange
        const authenticationId = 'nonexistent-auth-id'
        prisma.activeUser.findUnique.mockResolvedValue(null)

        // Act
        const result = await useCase.findActiveByAuthenticationId(authenticationId)

        // Assert
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value).toBeNull()
        }
      })
    })

    describe('例外・制約違反', () => {
      it('データベースエラー時は適切にエラーを返す', async () => {
        // Arrange
        const authenticationId = 'auth-id-123'
        const dbError = new Error('Database connection failed')
        prisma.activeUser.findUnique.mockRejectedValue(dbError)

        // Act
        const result = await useCase.findActiveByAuthenticationId(authenticationId)

        // Assert
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error.message).toBe('Database connection failed')
        }
      })
    })
  })
})
