import { beforeEach, describe, expect, it } from 'vitest'
import { ServerError } from '@/common/errors'
import getRdbClient, { mockRdbExecutor } from '@/test/__mocks__/rdb'
import CommandImpl from './command-impl'

describe('CommandImpl', () => {
  let commandImpl: CommandImpl

  beforeEach(() => {
    commandImpl = new CommandImpl(getRdbClient('file::memory:'))
  })

  describe('createReadHistory', () => {
    it('DBにはnumberで渡し、戻り値はbigintに変換する', async () => {
      const activeUserId = 1n
      const articleId = 100n
      const readAt = new Date('2024-01-15T09:30:00Z')
      // INFO: insert ... returning のカラム順:
      // read_history_id, read_at, created_at, article_id, active_user_id
      mockRdbExecutor.mockResolvedValue({
        rows: [[10, '2024-01-15T09:30:00.000Z', '2024-01-15T09:30:00.000Z', 100, 1]],
      })

      const result = await commandImpl.createReadHistory(activeUserId, articleId, readAt)

      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      const [sql, params, method] = mockRdbExecutor.mock.calls[0]
      expect(sql).toContain('insert into "read_histories"')
      expect(sql).toContain('returning')
      expect(params).toEqual(['2024-01-15T09:30:00.000Z', 100, 1])
      expect(method).toBe('all')

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.readHistoryId).toBe(10n)
        expect(result.value.activeUserId).toBe(1n)
        expect(result.value.articleId).toBe(100n)
      }
    })

    it('insert...returningが空行の場合はServerErrorを返す', async () => {
      mockRdbExecutor.mockResolvedValue({ rows: [] })

      const result = await commandImpl.createReadHistory(1n, 100n, new Date('2024-01-15T09:30:00Z'))

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ServerError)
      }
    })

    it('DBエラー時は失敗を返す', async () => {
      const errorMessage = 'Database connection failed'
      mockRdbExecutor.mockRejectedValue(new Error(errorMessage))

      const result = await commandImpl.createReadHistory(1n, 100n, new Date('2024-01-15T09:30:00Z'))

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe(errorMessage)
      }
    })
  })

  describe('createSkippedArticle', () => {
    it('DBにはnumberで渡し、戻り値はbigintに変換する', async () => {
      // INFO: insert ... on conflict do update returning のカラム順:
      // skipped_article_id, created_at, article_id, active_user_id
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [[10, '2024-01-15T09:30:00.000Z', 100, 1]],
      })

      const result = await commandImpl.createSkippedArticle(1n, 100n)

      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      const [sql, params, method] = mockRdbExecutor.mock.calls[0]
      expect(sql).toContain('insert into "skipped_articles"')
      expect(sql).toContain('on conflict')
      expect(sql).toContain('do update')
      expect(sql).toContain('returning')
      // INFO: values(article_id, active_user_id) + do update set active_user_id の3引数
      expect(params).toEqual([100, 1, 1])
      expect(method).toBe('all')

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.skippedArticleId).toBe(10n)
        expect(result.value.activeUserId).toBe(1n)
        expect(result.value.articleId).toBe(100n)
      }
    })

    it('既にスキップ済み(競合)でも単一insertのreturningで既存行を返す', async () => {
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [[10, '2024-01-15T09:30:00.000Z', 100, 1]],
      })

      const result = await commandImpl.createSkippedArticle(1n, 100n)

      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      const [sql] = mockRdbExecutor.mock.calls[0]
      expect(sql).toContain('on conflict')
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.skippedArticleId).toBe(10n)
        expect(result.value.activeUserId).toBe(1n)
        expect(result.value.articleId).toBe(100n)
      }
    })

    it('insert...returningが空行の場合はServerErrorを返す', async () => {
      mockRdbExecutor.mockResolvedValueOnce({ rows: [] })

      const result = await commandImpl.createSkippedArticle(1n, 100n)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ServerError)
      }
    })

    it('DBエラー時は失敗を返す', async () => {
      const errorMessage = 'Database connection failed'
      mockRdbExecutor.mockRejectedValue(new Error(errorMessage))

      const result = await commandImpl.createSkippedArticle(1n, 100n)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe(errorMessage)
      }
    })
  })

  describe('deleteAllReadHistory', () => {
    it('DBにはnumberで渡して削除する', async () => {
      mockRdbExecutor.mockResolvedValue({ rows: [] })

      const result = await commandImpl.deleteAllReadHistory(2n, 200n)

      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      const [sql, params, method] = mockRdbExecutor.mock.calls[0]
      expect(sql).toContain('delete from "read_histories"')
      expect(params).toEqual([2, 200])
      expect(method).toBe('run')

      expect(result.isOk()).toBe(true)
    })

    it('DBエラー時は失敗を返す', async () => {
      const errorMessage = 'Database connection failed'
      mockRdbExecutor.mockRejectedValue(new Error(errorMessage))

      const result = await commandImpl.deleteAllReadHistory(1n, 100n)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe(errorMessage)
      }
    })
  })
})
