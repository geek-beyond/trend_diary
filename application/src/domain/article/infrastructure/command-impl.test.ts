import { beforeEach, describe, expect, it } from 'vitest'
import { isFailure, isSuccess } from '@/common/result'
import mockDb from '@/test/__mocks__/prisma'
import CommandImpl from './command-impl'

describe('CommandImpl', () => {
  let commandImpl: CommandImpl

  beforeEach(() => {
    commandImpl = new CommandImpl(mockDb)
  })

  describe('createReadHistory', () => {
    it('DBにはnumberで渡し、戻り値はbigintに変換する', async () => {
      const activeUserId = 1n
      const articleId = 100n
      const readAt = new Date('2024-01-15T09:30:00Z')
      mockDb.readHistory.create.mockResolvedValue({
        readHistoryId: 10,
        activeUserId: 1,
        articleId: 100,
        readAt,
        createdAt: new Date('2024-01-15T09:30:00Z'),
      })

      const result = await commandImpl.createReadHistory(activeUserId, articleId, readAt)

      expect(mockDb.readHistory.create).toHaveBeenCalledWith({
        data: { activeUserId: 1, articleId: 100, readAt },
      })
      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data.readHistoryId).toBe(10n)
        expect(result.data.activeUserId).toBe(1n)
        expect(result.data.articleId).toBe(100n)
      }
    })

    it.each([{ errorMessage: 'Database connection failed' }])(
      'DBエラー時は失敗を返す',
      async ({ errorMessage }) => {
        mockDb.readHistory.create.mockRejectedValue(new Error(errorMessage))

        const result = await commandImpl.createReadHistory(
          1n,
          100n,
          new Date('2024-01-15T09:30:00Z'),
        )

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error.message).toBe(errorMessage)
        }
      },
    )
  })

  describe('createSkippedArticle', () => {
    it('DBにはnumberで渡し、戻り値はbigintに変換する', async () => {
      mockDb.skippedArticle.upsert.mockResolvedValue({
        skippedArticleId: 10,
        activeUserId: 1,
        articleId: 100,
        createdAt: new Date('2024-01-15T09:30:00Z'),
      })

      const result = await commandImpl.createSkippedArticle(1n, 100n)

      expect(mockDb.skippedArticle.upsert).toHaveBeenCalledWith({
        where: {
          articleIdActiveUserId: {
            articleId: 100,
            activeUserId: 1,
          },
        },
        update: {},
        create: {
          activeUserId: 1,
          articleId: 100,
        },
      })
      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data.skippedArticleId).toBe(10n)
        expect(result.data.activeUserId).toBe(1n)
        expect(result.data.articleId).toBe(100n)
      }
    })

    it.each([{ errorMessage: 'Database connection failed' }])(
      'DBエラー時は失敗を返す',
      async ({ errorMessage }) => {
        mockDb.skippedArticle.upsert.mockRejectedValue(new Error(errorMessage))

        const result = await commandImpl.createSkippedArticle(1n, 100n)

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error.message).toBe(errorMessage)
        }
      },
    )
  })

  describe('deleteAllReadHistory', () => {
    it('DBにはnumberで渡して削除する', async () => {
      mockDb.readHistory.deleteMany.mockResolvedValue({ count: 5 })

      const result = await commandImpl.deleteAllReadHistory(2n, 200n)

      expect(mockDb.readHistory.deleteMany).toHaveBeenCalledWith({
        where: { activeUserId: 2, articleId: 200 },
      })
      expect(isSuccess(result)).toBe(true)
    })

    it.each([{ errorMessage: 'Database connection failed' }])(
      'DBエラー時は失敗を返す',
      async ({ errorMessage }) => {
        mockDb.readHistory.deleteMany.mockRejectedValue(new Error(errorMessage))

        const result = await commandImpl.deleteAllReadHistory(1n, 100n)

        expect(isFailure(result)).toBe(true)
        if (isFailure(result)) {
          expect(result.error.message).toBe(errorMessage)
        }
      },
    )
  })
})
