import { faker } from '@faker-js/faker'
import { NotFoundError, ServerError } from '@trend-diary/common/errors'
import { OffsetPaginationResult } from '@trend-diary/common/pagination'
import { err, ok } from 'neverthrow'
import { mockDeep } from 'vitest-mock-extended'
import { Command, Query } from './repository'
import type { Article, ArticleWithOptionalReadStatus } from './schema/article-schema'
import type { DailyDiary } from './schema/diary-schema'
import { QueryParams } from './schema/query-schema'
import type { ReadHistory } from './schema/read-history-schema'
import type { SkippedArticle } from './schema/skipped-article-schema'
import { UseCase } from './use-case'

const mockArticle: Article = {
  articleId: BigInt(1),
  media: 'qiita',
  title: faker.lorem.sentence(),
  author: faker.person.fullName(),
  description: faker.lorem.paragraph(),
  url: faker.internet.url(),
  createdAt: new Date(),
}

const mockPaginationResult: OffsetPaginationResult<ArticleWithOptionalReadStatus> = {
  data: [mockArticle],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
}

const mockPaginationResultWithReadStatus: OffsetPaginationResult<ArticleWithOptionalReadStatus> = {
  data: [{ ...mockArticle, isRead: true }],
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
}

const mockDailyDiary: DailyDiary = {
  date: '2026-03-07',
  summary: { read: 8, skip: 2 },
  sources: [
    { media: 'qiita', read: 5, skip: 2 },
    { media: 'zenn', read: 3, skip: 0 },
    { media: 'hatena', read: 0, skip: 0 },
  ],
  reads: {
    data: [
      {
        readHistoryId: 1n,
        articleId: 10n,
        media: 'qiita',
        title: 'Go error handling',
        url: 'https://example.com/go-error-handling',
        readAt: new Date('2026-03-07T08:00:00.000Z'),
      },
    ],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
}

const queryMock = mockDeep<Query>()
const commandMock = mockDeep<Command>()

describe('ArticleUseCase', () => {
  const useCase = new UseCase(queryMock, commandMock)
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchArticles', () => {
    describe('正常系', () => {
      it('有効なパラメータで記事検索成功', async () => {
        const params: QueryParams = {
          title: 'test title',
          author: 'test author',
          media: 'qiita',
          from: '2024-01-01',
          to: '2024-01-31',
          readStatus: false,
          limit: 20,
          page: 1,
        }

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResult))

        const result = await useCase.searchArticles(params)

        expect(result).toEqual(ok(mockPaginationResult))
        expect(queryMock.searchArticles).toHaveBeenCalledTimes(1)
        const calledArgs = queryMock.searchArticles.mock.calls[0][0]
        expect(calledArgs).toEqual(params)
      })

      it('全てのパラメータが含まれるfrom/to検索', async () => {
        const params: QueryParams = {
          title: 'test title',
          author: 'test author',
          media: 'qiita',
          from: '2024-01-01',
          to: '2024-01-31',
          readStatus: false,
          limit: 10,
          page: 2,
        }

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResult))

        const result = await useCase.searchArticles(params)

        expect(result).toEqual(ok(mockPaginationResult))
        expect(queryMock.searchArticles).toHaveBeenCalledTimes(1)
        const calledArgs = queryMock.searchArticles.mock.calls[0][0]
        expect(calledArgs).toEqual(params)
      })

      it('titleパラメータのみで検索', async () => {
        const params: QueryParams = {
          title: 'test title',
          limit: 20,
          page: 1,
        }

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResult))

        const result = await useCase.searchArticles(params)

        expect(result).toEqual(ok(mockPaginationResult))
        expect(queryMock.searchArticles).toHaveBeenCalledWith(
          {
            title: 'test title',
            limit: 20,
            page: 1,
          },
          undefined,
        )
      })

      it('authorパラメータのみで検索', async () => {
        const params: QueryParams = {
          author: 'test author',
          limit: 20,
          page: 1,
        }

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResult))

        const result = await useCase.searchArticles(params)

        expect(result).toEqual(ok(mockPaginationResult))
        expect(queryMock.searchArticles).toHaveBeenCalledWith(
          {
            author: 'test author',
            limit: 20,
            page: 1,
          },
          undefined,
        )
      })

      it('mediaパラメータのみで検索', async () => {
        const params: QueryParams = {
          media: 'zenn',
          limit: 20,
          page: 1,
        }

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResult))

        const result = await useCase.searchArticles(params)

        expect(result).toEqual(ok(mockPaginationResult))
        expect(queryMock.searchArticles).toHaveBeenCalledWith(
          {
            media: 'zenn',
            limit: 20,
            page: 1,
          },
          undefined,
        )
      })

      it('fromパラメータのみで検索', async () => {
        const params: QueryParams = {
          from: '2024-01-01',
          limit: 20,
          page: 1,
        }

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResult))

        const result = await useCase.searchArticles(params)

        expect(result).toEqual(ok(mockPaginationResult))
        expect(queryMock.searchArticles).toHaveBeenCalledWith(
          {
            from: '2024-01-01',
            limit: 20,
            page: 1,
          },
          undefined,
        )
      })

      it('toパラメータのみで検索', async () => {
        const params: QueryParams = {
          to: '2024-01-31',
          limit: 20,
          page: 1,
        }

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResult))

        const result = await useCase.searchArticles(params)

        expect(result).toEqual(ok(mockPaginationResult))
        expect(queryMock.searchArticles).toHaveBeenCalledWith(
          {
            to: '2024-01-31',
            limit: 20,
            page: 1,
          },
          undefined,
        )
      })

      it('from/toパラメータの組み合わせで検索', async () => {
        const params: QueryParams = {
          from: '2024-01-01',
          to: '2024-01-31',
          limit: 20,
          page: 1,
        }

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResult))

        const result = await useCase.searchArticles(params)

        expect(result).toEqual(ok(mockPaginationResult))
        expect(queryMock.searchArticles).toHaveBeenCalledWith(
          {
            from: '2024-01-01',
            to: '2024-01-31',
            limit: 20,
            page: 1,
          },
          undefined,
        )
      })

      it('readStatusパラメータのみで検索', async () => {
        const params: QueryParams = {
          readStatus: true,
          limit: 20,
          page: 1,
        }

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResult))

        const result = await useCase.searchArticles(params)

        expect(result).toEqual(ok(mockPaginationResult))
        expect(queryMock.searchArticles).toHaveBeenCalledWith(
          {
            readStatus: true,
            limit: 20,
            page: 1,
          },
          undefined,
        )
      })

      it('activeUserIdを渡すと既読情報付きで記事検索成功', async () => {
        const params: QueryParams = {
          limit: 20,
          page: 1,
        }
        const activeUserId = 100n

        queryMock.searchArticles.mockResolvedValue(ok(mockPaginationResultWithReadStatus))

        const result = await useCase.searchArticles(params, activeUserId)

        expect(result).toEqual(ok(mockPaginationResultWithReadStatus))
        expect(queryMock.searchArticles).toHaveBeenCalledWith(
          {
            limit: 20,
            page: 1,
          },
          activeUserId,
        )
      })
    })

    it('異常系: リポジトリ層でのDBエラー', async () => {
      const params: QueryParams = {
        title: 'test title',
        limit: 20,
        page: 1,
      }

      const dbError = new ServerError('Database error')
      queryMock.searchArticles.mockResolvedValue(err(dbError))

      const result = await useCase.searchArticles(params)

      expect(result).toEqual(err(dbError))
    })
  })

  describe('createReadHistory', () => {
    it('正常にReadHistoryを作成できること', async () => {
      const userId = 100n
      const articleId = 200n
      const readAt = new Date('2024-01-01T10:00:00Z')

      // 記事存在確認のモック
      queryMock.findArticleById.mockResolvedValue(ok(mockArticle))

      const mockReadHistory: ReadHistory = {
        readHistoryId: 1n,
        activeUserId: userId,
        articleId: articleId,
        readAt: readAt,
        createdAt: new Date(),
      }
      commandMock.createReadHistory.mockResolvedValue(ok(mockReadHistory))

      const result = await useCase.createReadHistory(userId, articleId, readAt)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.activeUserId).toBe(userId)
        expect(result.value.articleId).toBe(articleId)
        expect(result.value.readAt).toBe(readAt)
      }

      expect(queryMock.findArticleById).toHaveBeenCalledWith(articleId)
      expect(commandMock.createReadHistory).toHaveBeenCalledWith(
        userId,
        mockArticle.articleId,
        readAt,
      )
    })

    it('データベースエラー時にServerErrorを返すこと', async () => {
      const userId = 100n
      const articleId = 200n
      const readAt = new Date('2024-01-01T10:00:00Z')

      // 記事存在確認のモック
      queryMock.findArticleById.mockResolvedValue(ok(mockArticle))

      const dbError = new ServerError('Database error')
      commandMock.createReadHistory.mockResolvedValue(err(dbError))

      const result = await useCase.createReadHistory(userId, articleId, readAt)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBe(dbError)
      }
    })

    it('存在しない記事でNotFoundErrorを返すこと', async () => {
      const userId = 100n
      const articleId = 999n
      const readAt = new Date('2024-01-01T10:00:00Z')

      // 記事が存在しない場合のモック
      queryMock.findArticleById.mockResolvedValue(ok(null))

      const result = await useCase.createReadHistory(userId, articleId, readAt)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError)
        expect(result.error.message).toBe('Article with ID 999 not found')
      }

      expect(queryMock.findArticleById).toHaveBeenCalledWith(articleId)
      expect(commandMock.createReadHistory).not.toHaveBeenCalled()
    })
  })

  describe('deleteAllReadHistory', () => {
    it('正常にReadHistoryを全削除できること', async () => {
      const userId = 100n
      const articleId = 200n

      queryMock.findArticleById.mockResolvedValue(ok(mockArticle))
      commandMock.deleteAllReadHistory.mockResolvedValue(ok(undefined))

      const result = await useCase.deleteAllReadHistory(userId, articleId)

      expect(result.isOk()).toBe(true)
      expect(commandMock.deleteAllReadHistory).toHaveBeenCalledWith(userId, mockArticle.articleId)
    })

    it('データベースエラー時にServerErrorを返すこと', async () => {
      const userId = 100n
      const articleId = 200n

      queryMock.findArticleById.mockResolvedValue(ok(mockArticle))
      const dbError = new ServerError('Database error')
      commandMock.deleteAllReadHistory.mockResolvedValue(err(dbError))

      const result = await useCase.deleteAllReadHistory(userId, articleId)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBe(dbError)
      }
    })
  })

  describe('getUnreadDigestionArticles', () => {
    it.each([
      {
        name: 'media未指定',
        media: undefined,
      },
      {
        name: 'media指定あり',
        media: 'qiita' as const,
      },
    ])('$name で当日JST日付を使って取得できる', async ({ media }) => {
      queryMock.getUnreadDigestionArticles.mockResolvedValue(ok([mockArticle]))
      const now = new Date('2026-03-07T00:00:00.000Z')

      const result = await useCase.getUnreadDigestionArticles(100n, media, now)

      expect(result.isOk()).toBe(true)
      expect(queryMock.getUnreadDigestionArticles).toHaveBeenCalledWith(100n, '2026-03-07', media)
    })
  })

  describe('getDailyDiary', () => {
    it('指定日の日次ダイアリーを取得できる', async () => {
      queryMock.getDailyDiary.mockResolvedValue(ok(mockDailyDiary))

      const result = await useCase.getDailyDiary(100n, '2026-03-07', 1, 10)

      expect(result.isOk()).toBe(true)
      expect(queryMock.getDailyDiary).toHaveBeenCalledWith(100n, '2026-03-07', 1, 10)
      if (result.isOk()) {
        expect(result.value.summary.read).toBe(8)
      }
    })
  })

  describe('createSkippedArticle', () => {
    it('記事が存在する場合にskip登録できる', async () => {
      const activeUserId = 100n
      const articleId = 200n
      const mockSkippedArticle: SkippedArticle = {
        skippedArticleId: 1n,
        activeUserId,
        articleId,
        createdAt: new Date(),
      }

      queryMock.findArticleById.mockResolvedValue(ok(mockArticle))
      commandMock.createSkippedArticle.mockResolvedValue(ok(mockSkippedArticle))

      const result = await useCase.createSkippedArticle(activeUserId, articleId)

      expect(result.isOk()).toBe(true)
      expect(commandMock.createSkippedArticle).toHaveBeenCalledWith(
        activeUserId,
        mockArticle.articleId,
      )
    })

    it.each([
      {
        name: '記事が存在しない',
        arrange: () => queryMock.findArticleById.mockResolvedValue(ok(null)),
        expectedError: NotFoundError,
      },
      {
        name: '記事検索で失敗',
        arrange: () => queryMock.findArticleById.mockResolvedValue(err(new ServerError('db'))),
        expectedError: ServerError,
      },
    ])('$name 場合は失敗を返す', async ({ arrange, expectedError }) => {
      arrange()

      const result = await useCase.createSkippedArticle(100n, 200n)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(expectedError)
      }
    })
  })
})
