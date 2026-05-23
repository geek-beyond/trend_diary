import { Article as PrismaArticle } from '@prisma/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { isFailure, isSuccess } from '@/common/result'
import mockDb from '@/test/__mocks__/prisma'
import QueryImpl from './query-impl'

describe('QueryImpl', () => {
  let queryImpl: QueryImpl

  const mockArticles = [
    {
      articleId: 1n,
      media: 'qiita',
      title: 'TypeScriptの型安全性について',
      author: '山田太郎',
      description: 'TypeScriptの型安全性に関する解説記事です',
      url: 'https://example.com/article/1',
      createdAt: new Date('2024-01-15T09:30:00Z'),
    },
    {
      articleId: 2n,
      media: 'zenn',
      title: 'Reactのフック活用法',
      author: '佐藤花子',
      description: 'Reactのフックについて詳しく解説します',
      url: 'https://example.com/article/2',
      createdAt: new Date('2024-01-14T10:00:00Z'),
    },
  ]

  beforeEach(() => {
    queryImpl = new QueryImpl(mockDb)
  })

  it.todo('DB方言ごとにcreatedAt/readAtの日時正規化SQLを切り替えられる')

  describe('searchArticles', () => {
    it('ページネーション付きで記事を検索できる', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([{ total: 2 }]).mockResolvedValueOnce([
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
      ])

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 })

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data.total).toBe(2)
        expect(result.data.data).toHaveLength(2)
        expect(result.data.data[0].isRead).toBeUndefined()
      }
    })

    it('activeUserId指定時は既読状態を返す', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([{ total: 2 }]).mockResolvedValueOnce([
        {
          articleId: 1n,
          media: 'qiita',
          title: 'TypeScriptの型安全性について',
          author: '山田太郎',
          description: 'TypeScriptの型安全性に関する解説記事です',
          url: 'https://example.com/article/1',
          createdAt: new Date('2024-01-15T09:30:00Z'),
          isRead: 1,
        },
        {
          articleId: 2n,
          media: 'zenn',
          title: 'Reactのフック活用法',
          author: '佐藤花子',
          description: 'Reactのフックについて詳しく解説します',
          url: 'https://example.com/article/2',
          createdAt: new Date('2024-01-14T10:00:00Z'),
          isRead: 0,
        },
      ])

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 }, 10n)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data.data[0].isRead).toBe(true)
        expect(result.data.data[1].isRead).toBe(false)
      }
    })

    it('activeUserId指定時はスキップ済み記事を除外する条件を付与する', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([])

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 }, 10n)

      expect(isSuccess(result)).toBe(true)
      expect(mockDb.$queryRaw).toHaveBeenCalledTimes(2)
      const rawSql = mockDb.$queryRaw.mock.calls[0]?.[0] as { strings?: string[] }
      const joinedSql = rawSql?.strings?.join(' ') ?? ''
      expect(joinedSql).toContain('skipped_articles')
    })

    it('件数取得失敗時はエラーを返す', async () => {
      mockDb.$queryRaw.mockRejectedValue(new Error('count failed'))

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 })

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toBe('count failed')
      }
    })

    it('from/to指定時は取得後に日付で絞り込みできる', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([{ total: 2 }]).mockResolvedValueOnce([
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
      ])

      const result = await queryImpl.searchArticles({
        page: 1,
        limit: 20,
        from: '2026-03-05',
        to: '2026-03-05',
      })

      expect(isSuccess(result)).toBe(true)
      expect(mockDb.article.count).not.toHaveBeenCalled()
      expect(mockDb.article.findMany).not.toHaveBeenCalled()
      expect(mockDb.$queryRaw).toHaveBeenCalledTimes(2)

      if (isSuccess(result)) {
        expect(result.data.total).toBe(2)
        expect(result.data.data).toHaveLength(2)
        expect(result.data.data[0].title).toBe('対象記事1')
        expect(result.data.data[1].title).toBe('対象記事2')
      }
    })
  })

  describe('findArticleById', () => {
    it('記事をIDで検索できる', async () => {
      mockDb.article.findUnique.mockResolvedValue(mockArticles[0] as unknown as PrismaArticle)

      const result = await queryImpl.findArticleById(1n)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data?.articleId).toBe(1n)
      }
    })
  })

  describe('getUnreadDigestionArticles', () => {
    it.each([
      {
        name: 'createdAtがstring',
        createdAt: '2026-03-07T01:00:00.000Z',
        expectedIso: '2026-03-07T01:00:00.000Z',
        media: undefined,
      },
      {
        name: 'createdAtがDate',
        createdAt: new Date('2026-03-07T02:00:00.000Z'),
        expectedIso: '2026-03-07T02:00:00.000Z',
        media: 'qiita' as const,
      },
      {
        name: 'createdAtがbigint(epoch ms)',
        createdAt: 1_772_852_400_000n,
        expectedIso: '2026-03-07T03:00:00.000Z',
        media: 'zenn' as const,
      },
    ])('$name をArticleへ変換できる', async ({ createdAt, expectedIso, media }) => {
      mockDb.$queryRaw.mockResolvedValue([
        {
          articleId: 1,
          media: 'qiita',
          title: '未読消化対象',
          author: '山田太郎',
          description: '未読消化の説明',
          url: 'https://example.com/unread',
          createdAt,
        },
      ])

      const result = await queryImpl.getUnreadDigestionArticles(10n, '2026-03-07', media)

      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].articleId).toBe(1n)
        expect(result.data[0].title).toBe('未読消化対象')
        expect(result.data[0].createdAt.toISOString()).toBe(expectedIso)
      }
    })

    it('DB取得失敗時はエラーを返す', async () => {
      mockDb.$queryRaw.mockRejectedValue(new Error('unread digestion failed'))

      const result = await queryImpl.getUnreadDigestionArticles(10n, '2026-03-07')

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toBe('unread digestion failed')
      }
    })
  })

  describe('getDailyDiary', () => {
    it('日次サマリーとsources、read一覧を取得できる', async () => {
      mockDb.$queryRaw
        .mockResolvedValueOnce([
          { sourceType: 'read', media: 'qiita', count: 2 },
          { sourceType: 'read', media: 'zenn', count: 1 },
          { sourceType: 'skip', media: 'qiita', count: 1 },
          { sourceType: 'skip', media: 'hatena', count: 1 },
        ]) // diary sources
        .mockResolvedValueOnce([
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
        ]) // reads page

      const result = await queryImpl.getDailyDiary(10n, '2026-03-07', 1, 10)

      expect(isSuccess(result)).toBe(true)
      expect(mockDb.$queryRaw).toHaveBeenCalledTimes(2)
      if (isSuccess(result)) {
        expect(result.data.summary).toEqual({ read: 3, skip: 2 })
        expect(result.data.sources).toEqual([
          { media: 'qiita', read: 2, skip: 1 },
          { media: 'zenn', read: 1, skip: 0 },
          { media: 'hatena', read: 0, skip: 1 },
        ])
        expect(result.data.reads.total).toBe(3)
        expect(result.data.reads.data).toHaveLength(2)
        expect(result.data.reads.data[0].readHistoryId).toBe(10n)
        expect(result.data.reads.data[0].url).toBe('https://example.com/go-error-handling')
        expect(result.data.reads.data[1].readHistoryId).toBe(9n)
      }
    })

    it('DB取得失敗時はエラーを返す', async () => {
      mockDb.$queryRaw.mockRejectedValue(new Error('daily diary failed'))

      const result = await queryImpl.getDailyDiary(10n, '2026-03-07', 1, 10)

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toBe('daily diary failed')
      }
    })
  })

  describe('getDailyDiaryRange', () => {
    it('指定期間の日次サマリーとsourcesを取得できる', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([
        { sourceType: 'read', date: '2026-03-06', media: 'qiita', count: 2 },
        { sourceType: 'read', date: '2026-03-07', media: 'zenn', count: 1 },
        { sourceType: 'skip', date: '2026-03-07', media: 'hatena', count: 1 },
      ])

      const result = await queryImpl.getDailyDiaryRange(10n, '2026-03-06', '2026-03-07')

      expect(isSuccess(result)).toBe(true)
      expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1)
      if (isSuccess(result)) {
        expect(result.data).toEqual([
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
      mockDb.$queryRaw.mockRejectedValue(new Error('daily diary range failed'))

      const result = await queryImpl.getDailyDiaryRange(10n, '2026-03-06', '2026-03-07')

      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toBe('daily diary range failed')
      }
    })
  })
})
