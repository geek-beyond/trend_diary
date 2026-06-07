import { type SQL, sql } from 'drizzle-orm'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'
import { beforeEach, describe, expect, it } from 'vitest'
import getRdbClient, { mockRdbExecutor } from '../../test-helper/rdb'
import QueryImpl from './query-impl'

type DateRangeSqlBuilders = {
  buildClosedOpenDateRangeSql(columnName: string, fromDate: Date, toDateExclusive: Date): SQL
  buildDateRangeConditions(
    columnName: string,
    range: { fromDate?: Date; toDateExclusive?: Date },
  ): SQL[]
}
const dateRangeSqlBuilders = QueryImpl as unknown as DateRangeSqlBuilders

describe('QueryImpl', () => {
  let queryImpl: QueryImpl

  beforeEach(() => {
    queryImpl = new QueryImpl(getRdbClient())
  })

  it.todo('DB方言ごとにcreatedAt/readAtの日時正規化SQLを切り替えられる')

  describe('searchArticles', () => {
    it('ページネーション付きで記事を検索できる', async () => {
      // INFO: 生SQL(db.all)は実ドライバ(libsql)でカラム別名キーのオブジェクトを返すため、
      // モックも別名キーのオブジェクトで戻り行を注入する
      mockRdbExecutor.mockResolvedValueOnce({ rows: [{ total: 2 }] }).mockResolvedValueOnce({
        rows: [
          {
            articleId: 1,
            media: 'qiita',
            title: 'TypeScriptの型安全性について',
            author: '山田太郎',
            description: 'TypeScriptの型安全性に関する解説記事です',
            url: 'https://example.com/article/1',
            createdAt: '2024-01-15T09:30:00.000Z',
            isRead: null,
          },
          {
            articleId: 2,
            media: 'zenn',
            title: 'Reactのフック活用法',
            author: '佐藤花子',
            description: 'Reactのフックについて詳しく解説します',
            url: 'https://example.com/article/2',
            createdAt: '2024-01-14T10:00:00.000Z',
            isRead: null,
          },
        ],
      })

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 })

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.total).toBe(2)
        expect(result.value.data).toHaveLength(2)
        expect(result.value.data[0].isRead).toBeUndefined()
      }
    })

    it('activeUserId指定時は既読状態を返す', async () => {
      mockRdbExecutor.mockResolvedValueOnce({ rows: [{ total: 2 }] }).mockResolvedValueOnce({
        rows: [
          {
            articleId: 1,
            media: 'qiita',
            title: 'TypeScriptの型安全性について',
            author: '山田太郎',
            description: 'TypeScriptの型安全性に関する解説記事です',
            url: 'https://example.com/article/1',
            createdAt: '2024-01-15T09:30:00.000Z',
            isRead: 1,
          },
          {
            articleId: 2,
            media: 'zenn',
            title: 'Reactのフック活用法',
            author: '佐藤花子',
            description: 'Reactのフックについて詳しく解説します',
            url: 'https://example.com/article/2',
            createdAt: '2024-01-14T10:00:00.000Z',
            isRead: 0,
          },
        ],
      })

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 }, 10n)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.data[0].isRead).toBe(true)
        expect(result.value.data[1].isRead).toBe(false)
      }
    })

    it('activeUserId指定時はスキップ済み記事を除外する条件を付与する', async () => {
      mockRdbExecutor
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] })

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 }, 10n)

      expect(result.isOk()).toBe(true)
      expect(mockRdbExecutor).toHaveBeenCalledTimes(2)
      const rawSql = mockRdbExecutor.mock.calls[0]?.[0] ?? ''
      expect(rawSql).toContain('skipped_articles')
    })

    it('件数取得失敗時はエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('count failed'))

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 })

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('count failed')
      }
    })

    it('from/to指定時は取得後に日付で絞り込みできる', async () => {
      mockRdbExecutor.mockResolvedValueOnce({ rows: [{ total: 2 }] }).mockResolvedValueOnce({
        rows: [
          {
            articleId: 1,
            media: 'qiita',
            title: '対象記事1',
            author: '山田',
            description: '当日の記事1',
            url: 'https://example.com/article/1',
            createdAt: '2026-03-04T15:00:00.000Z',
          },
          {
            articleId: 2,
            media: 'zenn',
            title: '対象記事2',
            author: '鈴木',
            description: '当日の記事2',
            url: 'https://example.com/article/2',
            createdAt: '2026-03-05T14:59:59.999Z',
          },
        ],
      })

      const result = await queryImpl.searchArticles({
        page: 1,
        limit: 20,
        from: '2026-03-05',
        to: '2026-03-05',
      })

      expect(result.isOk()).toBe(true)
      expect(mockRdbExecutor).toHaveBeenCalledTimes(2)

      if (result.isOk()) {
        expect(result.value.total).toBe(2)
        expect(result.value.data).toHaveLength(2)
        expect(result.value.data[0].title).toBe('対象記事1')
        expect(result.value.data[1].title).toBe('対象記事2')
      }
    })
  })

  describe('findArticleById', () => {
    it('記事をIDで検索できる', async () => {
      // INFO: クエリビルダ(select)の戻り行はカラム順の配列:
      // article_id, media, title, author, description, url, created_at
      mockRdbExecutor.mockResolvedValue({
        rows: [
          [
            1,
            'qiita',
            'TypeScriptの型安全性について',
            '山田太郎',
            'TypeScriptの型安全性に関する解説記事です',
            'https://example.com/article/1',
            '2024-01-15T09:30:00.000Z',
          ],
        ],
      })

      const result = await queryImpl.findArticleById(1n)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value?.articleId).toBe(1n)
      }
    })

    it('該当記事がない場合はnullを返す', async () => {
      mockRdbExecutor.mockResolvedValue({ rows: [] })

      const result = await queryImpl.findArticleById(999n)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBeNull()
      }
    })
  })

  describe('getUnreadDigestionArticles', () => {
    it.each([
      {
        name: 'createdAtがstring(ISO-8601)',
        createdAt: '2026-03-07T01:00:00.000Z',
        expectedIso: '2026-03-07T01:00:00.000Z',
        media: undefined,
      },
      {
        name: 'createdAtがCURRENT_TIMESTAMP形式(スペース区切りUTC)はTZ非依存でUTC解釈される',
        createdAt: '2025-01-01 00:00:00',
        expectedIso: '2025-01-01T00:00:00.000Z',
        media: 'qiita' as const,
      },
      {
        name: 'createdAtがnumber(epoch ms)',
        createdAt: 1_772_852_400_000,
        expectedIso: '2026-03-07T03:00:00.000Z',
        media: 'hatena' as const,
      },
      {
        name: 'createdAtがbigint(epoch ms)',
        createdAt: 1_772_852_400_000n,
        expectedIso: '2026-03-07T03:00:00.000Z',
        media: 'zenn' as const,
      },
    ])('$name をArticleへ変換できる', async ({ createdAt, expectedIso, media }) => {
      mockRdbExecutor.mockResolvedValue({
        rows: [
          {
            articleId: 1,
            media: 'qiita',
            title: '未読消化対象',
            author: '山田太郎',
            description: '未読消化の説明',
            url: 'https://example.com/unread',
            createdAt,
          },
        ],
      })

      const result = await queryImpl.getUnreadDigestionArticles(10n, '2026-03-07', media)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toHaveLength(1)
        expect(result.value[0].articleId).toBe(1n)
        expect(result.value[0].title).toBe('未読消化対象')
        expect(result.value[0].createdAt.toISOString()).toBe(expectedIso)
      }
    })

    it('DB取得失敗時はエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('unread digestion failed'))

      const result = await queryImpl.getUnreadDigestionArticles(10n, '2026-03-07')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('unread digestion failed')
      }
    })
  })

  describe('getDailyDiary', () => {
    it('日次サマリーとsources、read一覧を取得できる', async () => {
      mockRdbExecutor
        .mockResolvedValueOnce({
          rows: [
            { sourceType: 'read', media: 'qiita', count: 2 },
            { sourceType: 'read', media: 'zenn', count: 1 },
            { sourceType: 'skip', media: 'qiita', count: 1 },
            { sourceType: 'skip', media: 'hatena', count: 1 },
          ],
        }) // diary sources
        .mockResolvedValueOnce({
          rows: [
            {
              readHistoryId: 10,
              articleId: 1,
              media: 'qiita',
              title: 'Go error handling',
              url: 'https://example.com/go-error-handling',
              readAt: '2026-03-07T03:00:00.000Z',
            },
            {
              readHistoryId: 9,
              articleId: 1,
              media: 'qiita',
              title: 'Go error handling',
              url: 'https://example.com/go-error-handling',
              readAt: '2026-03-07T02:00:00.000Z',
            },
          ],
        }) // reads page

      const result = await queryImpl.getDailyDiary(10n, '2026-03-07', 1, 10)

      expect(result.isOk()).toBe(true)
      expect(mockRdbExecutor).toHaveBeenCalledTimes(2)
      if (result.isOk()) {
        expect(result.value.summary).toEqual({ read: 3, skip: 2 })
        expect(result.value.sources).toEqual([
          { media: 'qiita', read: 2, skip: 1 },
          { media: 'zenn', read: 1, skip: 0 },
          { media: 'hatena', read: 0, skip: 1 },
        ])
        expect(result.value.reads.total).toBe(3)
        expect(result.value.reads.data).toHaveLength(2)
        expect(result.value.reads.data[0].readHistoryId).toBe(10n)
        expect(result.value.reads.data[0].url).toBe('https://example.com/go-error-handling')
        expect(result.value.reads.data[1].readHistoryId).toBe(9n)
      }
    })

    it('DB取得失敗時はエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('daily diary failed'))

      const result = await queryImpl.getDailyDiary(10n, '2026-03-07', 1, 10)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('daily diary failed')
      }
    })
  })

  describe('getDailyDiaryRange', () => {
    it('指定期間の日次サマリーとsourcesを取得できる', async () => {
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [
          { sourceType: 'read', date: '2026-03-06', media: 'qiita', count: 2 },
          { sourceType: 'read', date: '2026-03-07', media: 'zenn', count: 1 },
          { sourceType: 'skip', date: '2026-03-07', media: 'hatena', count: 1 },
        ],
      })

      const result = await queryImpl.getDailyDiaryRange(10n, '2026-03-06', '2026-03-07')

      expect(result.isOk()).toBe(true)
      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      if (result.isOk()) {
        expect(result.value).toEqual([
          {
            date: '2026-03-06',
            summary: { read: 2, skip: 0 },
            sources: [
              { media: 'qiita', read: 2, skip: 0 },
              { media: 'zenn', read: 0, skip: 0 },
              { media: 'hatena', read: 0, skip: 0 },
            ],
          },
          {
            date: '2026-03-07',
            summary: { read: 1, skip: 1 },
            sources: [
              { media: 'qiita', read: 0, skip: 0 },
              { media: 'zenn', read: 1, skip: 0 },
              { media: 'hatena', read: 0, skip: 1 },
            ],
          },
        ])
      }
    })

    it('DB取得失敗時はエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('daily diary range failed'))

      const result = await queryImpl.getDailyDiaryRange(10n, '2026-03-06', '2026-03-07')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('daily diary range failed')
      }
    })
  })

  describe('日付範囲SQLビルダの同一性', () => {
    const dialect = new SQLiteSyncDialect()
    const fromDate = new Date('2026-03-06T00:00:00.000Z')
    const toDateExclusive = new Date('2026-03-07T00:00:00.000Z')

    it('buildClosedOpenDateRangeSqlとbuildDateRangeConditions(両端あり)は同一のSQL/パラメータを生成する', () => {
      const closedOpen = dialect.sqlToQuery(
        dateRangeSqlBuilders.buildClosedOpenDateRangeSql('created_at', fromDate, toDateExclusive),
      )
      const conditions = dateRangeSqlBuilders.buildDateRangeConditions('created_at', {
        fromDate,
        toDateExclusive,
      })
      const joined = dialect.sqlToQuery(sql.join(conditions, sql.raw(' AND ')))

      const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
      expect(normalize(closedOpen.sql)).toBe(normalize(joined.sql))
      expect(closedOpen.params).toEqual(joined.params)
    })
  })
})
