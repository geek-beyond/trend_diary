import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isFailure, isSuccess } from '@/common/result'
import prisma from '@/test/__mocks__/prisma'
import CommandImpl from './command-impl'

describe('CommandImpl', () => {
  let useCase: CommandImpl

  beforeEach(() => {
    vi.clearAllMocks()
    useCase = new CommandImpl(prisma)
  })

  describe('createActiveWithAuthenticationId', () => {
    it('displayName付きでActiveUserを作成できる', async () => {
      const createdActiveUser = {
        activeUserId: 1,
        userId: 2,
        email: 'test@example.com',
        displayName: '表示名',
        authenticationId: 'auth-id-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      prisma.activeUser.create.mockResolvedValue(createdActiveUser)

      const result = await useCase.createActiveWithAuthenticationId(
        'test@example.com',
        'auth-id-123',
        '表示名',
      )

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.displayName).toBe('表示名')
        expect(result.data.activeUserId).toBe(1n)
        expect(result.data.userId).toBe(2n)
      }
      const activeUserCreateArgs = prisma.activeUser.create.mock.calls[0]?.[0]
      expect(activeUserCreateArgs?.data).toMatchObject({
        email: 'test@example.com',
        authenticationId: 'auth-id-123',
        displayName: '表示名',
      })
      expect(activeUserCreateArgs?.data?.user).toEqual({ create: {} })
      expect(activeUserCreateArgs?.data?.activeUserId).toBeUndefined()
    })

    it('activeUser作成失敗時にエラーを返す', async () => {
      prisma.activeUser.create.mockRejectedValue(new Error('create active failed'))

      const result = await useCase.createActiveWithAuthenticationId(
        'test@example.com',
        'auth-id-123',
      )

      expect(isFailure(result)).toBe(true)
      expect(prisma.user.delete).not.toHaveBeenCalled()
      if (isFailure(result)) {
        expect(result.error.message).toBe('Failed to create active user')
      }
    })
  })
})
