import { beforeEach, describe, expect, it } from 'vitest'
import getRdbClient, { mockRdbExecutor } from '../../test-helper/rdb'
import { ArticleNotFoundError } from '../error'
import CommandImpl from './command-impl'

describe('CommandImpl', () => {
  let commandImpl: CommandImpl

  beforeEach(() => {
    commandImpl = new CommandImpl(getRdbClient())
  })

  describe('createReadHistory', () => {
    describe('正常系', () => {
      it('記事が存在する場合はINSERT...SELECTで作成し、戻り値をbigintへ変換する', async () => {
        const activeUserId = 1n
        const articleId = 100n
        const readAt = new Date('2024-01-15T09:30:00Z')
        // INFO: 生SQL(db.all)は別名キーのオブジェクトで行を返す
        mockRdbExecutor.mockResolvedValue({
          rows: [
            {
              readHistoryId: 10,
              activeUserId: 1,
              articleId: 100,
              readAt: '2024-01-15T09:30:00.000Z',
              createdAt: '2024-01-15T09:30:00.000Z',
            },
          ],
        })

        const result = await commandImpl.createReadHistory(activeUserId, articleId, readAt)

        expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
        const [sql, params, method] = mockRdbExecutor.mock.calls[0]
        expect(sql).toContain('INSERT INTO read_histories')
        expect(sql).toContain('WHERE EXISTS')
        expect(sql).toContain('RETURNING')
        // INFO: SELECT(active_user_id, article_id, read_at) + EXISTSのarticle_idの4引数
        expect(params).toEqual([1, 100, '2024-01-15T09:30:00.000Z', 100])
        expect(method).toBe('all')

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.readHistoryId).toBe(10n)
          expect(result.value.activeUserId).toBe(1n)
          expect(result.value.articleId).toBe(100n)
          expect(result.value.readAt).toEqual(new Date('2024-01-15T09:30:00.000Z'))
        }
      })
    })

    describe('準正常系', () => {
      it('記事が存在せず0行の場合は ArticleNotFoundError を返す', async () => {
        mockRdbExecutor.mockResolvedValue({ rows: [] })

        const result = await commandImpl.createReadHistory(
          1n,
          100n,
          new Date('2024-01-15T09:30:00Z'),
        )

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ArticleNotFoundError)
          expect(result.error.message).toBe('Article with ID 100 not found')
        }
      })
    })

    describe('異常系', () => {
      it('DBエラー時は失敗を返す', async () => {
        const errorMessage = 'Database connection failed'
        mockRdbExecutor.mockRejectedValue(new Error(errorMessage))

        const result = await commandImpl.createReadHistory(
          1n,
          100n,
          new Date('2024-01-15T09:30:00Z'),
        )

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(Error)
          expect(result.error.message).toBe(errorMessage)
        }
      })
    })
  })

  describe('createSkippedArticle', () => {
    describe('正常系', () => {
      it.each([
        { name: '新規スキップ登録', skippedArticleId: 10 },
        { name: '競合(既にスキップ済み)でも既存行を返す', skippedArticleId: 5 },
      ])('$name で戻り値をbigintへ変換する', async ({ skippedArticleId }) => {
        mockRdbExecutor.mockResolvedValueOnce({
          rows: [
            {
              skippedArticleId,
              activeUserId: 1,
              articleId: 100,
              createdAt: '2024-01-15T09:30:00.000Z',
            },
          ],
        })

        const result = await commandImpl.createSkippedArticle(1n, 100n)

        expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
        const [sql, params, method] = mockRdbExecutor.mock.calls[0]
        expect(sql).toContain('INSERT INTO skipped_articles')
        expect(sql).toContain('WHERE EXISTS')
        expect(sql).toContain('ON CONFLICT')
        expect(sql).toContain('DO UPDATE')
        expect(sql).toContain('RETURNING')
        // INFO: SELECT(active_user_id, article_id) + EXISTSのarticle_id + do update set active_user_id の4引数
        expect(params).toEqual([1, 100, 100, 1])
        expect(method).toBe('all')

        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value.skippedArticleId).toBe(BigInt(skippedArticleId))
          expect(result.value.activeUserId).toBe(1n)
          expect(result.value.articleId).toBe(100n)
        }
      })
    })

    describe('準正常系', () => {
      it('記事が存在せず0行の場合は ArticleNotFoundError を返す', async () => {
        mockRdbExecutor.mockResolvedValueOnce({ rows: [] })

        const result = await commandImpl.createSkippedArticle(1n, 100n)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ArticleNotFoundError)
          expect(result.error.message).toBe('Article with ID 100 not found')
        }
      })
    })

    describe('異常系', () => {
      it('DBエラー時は失敗を返す', async () => {
        const errorMessage = 'Database connection failed'
        mockRdbExecutor.mockRejectedValue(new Error(errorMessage))

        const result = await commandImpl.createSkippedArticle(1n, 100n)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(Error)
          expect(result.error.message).toBe(errorMessage)
        }
      })
    })
  })

  describe('deleteAllReadHistory', () => {
    describe('正常系', () => {
      it('記事が存在する場合は存在チェックと削除を1往復(batch)で実行する', async () => {
        // INFO: クエリビルダの戻り行はカラム順の配列。1クエリ目: 記事存在チェック(1行), 2クエリ目: DELETE
        mockRdbExecutor.mockResolvedValueOnce({ rows: [[200]] }).mockResolvedValueOnce({ rows: [] })

        const result = await commandImpl.deleteAllReadHistory(2n, 200n)

        expect(mockRdbExecutor).toHaveBeenCalledTimes(2)
        const [existsSql, existsParams, existsMethod] = mockRdbExecutor.mock.calls[0]
        expect(existsSql).toContain('from "articles"')
        expect(existsParams).toEqual([200, 1])
        expect(existsMethod).toBe('all')

        const [deleteSql, deleteParams, deleteMethod] = mockRdbExecutor.mock.calls[1]
        expect(deleteSql).toContain('delete from "read_histories"')
        expect(deleteSql).toContain('exists')
        expect(deleteParams).toEqual([2, 200, 200])
        expect(deleteMethod).toBe('run')

        expect(result.isOk()).toBe(true)
      })
    })

    describe('準正常系', () => {
      it('記事が存在しない場合は ArticleNotFoundError を返す', async () => {
        // 存在チェック・DELETEともに空(デフォルト)
        const result = await commandImpl.deleteAllReadHistory(2n, 200n)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ArticleNotFoundError)
          expect(result.error.message).toBe('Article with ID 200 not found')
        }
      })
    })

    describe('異常系', () => {
      it('DBエラー時は失敗を返す', async () => {
        const errorMessage = 'Database connection failed'
        mockRdbExecutor.mockRejectedValue(new Error(errorMessage))

        const result = await commandImpl.deleteAllReadHistory(1n, 100n)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(Error)
          expect(result.error.message).toBe(errorMessage)
        }
      })
    })
  })
})
