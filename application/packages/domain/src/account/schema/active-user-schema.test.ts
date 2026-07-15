import { describe, expect, it } from 'vitest'
import { activeUserInputSchema, activeUserSchema } from './active-user-schema'

describe('ActiveUserスキーマ', () => {
  describe('正常系', () => {
    it('有効なActiveUserデータを検証できる', () => {
      const validData = {
        activeUserId: 1n,
        userId: 2n,
        email: 'test@example.com',
        displayName: 'テストユーザー',
        authenticationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = activeUserSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('有効なActiveUserInputを検証できる', () => {
      const validInput = {
        email: 'test@example.com',
        displayName: 'テストユーザー',
      }

      const result = activeUserInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('displayNameがnullでも検証に成功する', () => {
      const validInput = {
        email: 'test@example.com',
        displayName: null,
      }

      const result = activeUserInputSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })
  })

  describe('準正常系', () => {
    it('オプションフィールドなしでも検証に成功する', () => {
      const minimalData = {
        activeUserId: 1n,
        userId: 2n,
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = activeUserSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })
  })

  describe('異常系', () => {
    it('無効なメールアドレスでは検証に失敗する', () => {
      const invalidData = {
        email: 'invalid-email',
      }

      const result = activeUserInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('負のIDでは検証に失敗する', () => {
      const invalidData = {
        activeUserId: -1n,
        userId: 2n,
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = activeUserSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('長すぎるdisplayNameでは検証に失敗する', () => {
      const invalidData = {
        email: 'test@example.com',
        displayName: 'a'.repeat(65), // 64文字を超える
      }

      const result = activeUserInputSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
