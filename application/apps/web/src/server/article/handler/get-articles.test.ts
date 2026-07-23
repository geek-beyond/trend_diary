import { faker } from '@faker-js/faker'
import { articles, readHistories } from '@trend-diary/datastore/schema'
import type * as ArticleModule from '@trend-diary/domain/article'
import { createArticleUseCase } from '@trend-diary/domain/article'
import { inArray } from 'drizzle-orm'
import { err } from 'neverthrow'
import { vi } from 'vitest'
import * as articleHelper from '@/test/helper/article'
import { testRdb as db } from '@/test/helper/rdb'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'
import type { ArticleListResponse, ArticleWithReadStatusResponse } from './get-articles'

// searchArticles は異常系テストでのみ失敗させたい。ただし vi.mock はファイル先頭へホイストされ
// モジュールスコープにしか置けず、異常系 describe の直前には配置できないためここで宣言する。
// 正常系・準正常系は vi.fn で実装へ委譲するため挙動は変わらない。
vi.mock('@trend-diary/domain/article', async (importOriginal) => {
  const actual = await importOriginal<typeof ArticleModule>()
  return { ...actual, createArticleUseCase: vi.fn(actual.createArticleUseCase) }
})

interface GetArticlesTestCase {
  name: string
  query: string
  status: number
}

async function requestGetArticles(query: string = '', cookies?: string) {
  const url = query ? `/api/articles?${query}` : '/api/articles'
  return apiRequest(url, { method: 'GET', cookies })
}

describe('GET /api/articles', () => {
  const titleCleanupPrefix = 'GET_ARTICLES_TEST_'
  const qiitaTitle = `${titleCleanupPrefix}Reactの基礎-${faker.string.alphanumeric(8)}`
  const zennTitle = `${titleCleanupPrefix}TypeScriptの応用-${faker.string.alphanumeric(8)}`
  const hatenaTitle = `${titleCleanupPrefix}はてブ注目記事-${faker.string.alphanumeric(8)}`
  const qiitaAuthor = `山田太郎-${faker.string.alphanumeric(6)}`
  const zennAuthor = `佐藤花子-${faker.string.alphanumeric(6)}`
  const hatenaAuthor = `鈴木次郎-${faker.string.alphanumeric(6)}`

  const testArticlesData = [
    {
      media: 'qiita' as const,
      title: qiitaTitle,
      author: qiitaAuthor,
      description: 'Reactについて学ぼう',
      url: 'https://qiita.com/test1',
      createdAt: new Date('2025-05-11'),
    },
    {
      media: 'zenn' as const,
      title: zennTitle,
      author: zennAuthor,
      description: 'TypeScriptの高度な機能',
      url: 'https://zenn.dev/test2',
      imageUrl: 'https://res.cloudinary.com/zenn/image/upload/og.png',
      createdAt: new Date('2025-05-12'),
    },
    {
      media: 'hatena' as const,
      title: hatenaTitle,
      author: hatenaAuthor,
      description: 'はてブの注目記事',
      url: 'https://b.hatena.ne.jp/entry/s/example.com/test3',
      createdAt: new Date('2025-05-13'),
    },
  ]

  const createdArticleIds: bigint[] = []

  beforeAll(async () => {
    await db.delete(readHistories)
    await db.delete(articles)

    const createdArticles = await Promise.all(
      testArticlesData.map((article) => articleHelper.createArticle(article)),
    )
    createdArticleIds.push(...createdArticles.map((a) => a.articleId))
  })

  afterAll(async () => {
    await articleHelper.cleanUp(createdArticleIds)
  })

  describe('正常系', () => {
    it('全件取得', async () => {
      const res = await requestGetArticles()

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(3)
      expect(data.data[0].title).toBe(hatenaTitle)
      expect(data.data[1].title).toBe(zennTitle)
      expect(data.data[2].title).toBe(qiitaTitle)
      expect(data.hasNext).toBe(false)
      expect(data.hasPrev).toBe(false)
    })

    it('imageUrl を含めて返し、画像が無い記事は null を返す', async () => {
      const res = await requestGetArticles('media=qiita&media=zenn')

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      const zennArticle = data.data.find((article) => article.media === 'zenn')
      const qiitaArticle = data.data.find((article) => article.media === 'qiita')
      expect(zennArticle?.imageUrl).toBe('https://res.cloudinary.com/zenn/image/upload/og.png')
      expect(qiitaArticle?.imageUrl).toBeNull()
    })

    it('titleで検索', async () => {
      const res = await requestGetArticles(`title=${encodeURIComponent(qiitaTitle)}`)

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe(qiitaTitle)
    })

    it('authorで検索', async () => {
      const res = await requestGetArticles(`author=${encodeURIComponent(qiitaAuthor)}`)

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].author).toBe(qiitaAuthor)
    })

    it('mediaで検索', async () => {
      const res = await requestGetArticles('media=qiita')

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].media).toBe('qiita')
    })

    it('media=hatenaで検索できる', async () => {
      const res = await requestGetArticles('media=hatena')

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].media).toBe('hatena')
    })

    it('複数のmediaを指定して検索できる', async () => {
      const res = await requestGetArticles('media=qiita&media=zenn')

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(2)
      expect(data.data.map((article) => article.media).toSorted()).toEqual(['qiita', 'zenn'])
    })

    it('read_statusパラメータを受け取る', async () => {
      const res = await requestGetArticles('read_status=1')

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(3)
    })

    it('複数条件での検索', async () => {
      const res = await requestGetArticles(`media=qiita&author=${encodeURIComponent(qiitaAuthor)}`)

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe(qiitaTitle)
    })

    it('fromパラメータで検索', async () => {
      const res = await requestGetArticles('from=2025-05-12')

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(2)
    })

    it('toパラメータで検索', async () => {
      const res = await requestGetArticles('to=2025-05-11')

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe(qiitaTitle)
    })

    it('from/toパラメータの範囲検索', async () => {
      const res = await requestGetArticles('from=2025-05-11&to=2025-05-12')

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(2)
    })

    it('from/toパラメータの範囲検索（該当なし）', async () => {
      const res = await requestGetArticles('from=2025-05-14&to=2025-05-15')

      expect(res.status).toBe(200)
      const data: ArticleListResponse = await res.json()
      expect(data.data).toHaveLength(0)
    })
  })

  describe('準正常系', () => {
    const testCases: GetArticlesTestCase[] = [
      {
        name: '不正なmedia値',
        query: 'media=invalid',
        status: 422,
      },
      {
        name: '不正なread_status値',
        query: 'read_status=2',
        status: 422,
      },
      {
        name: '不正なfrom形式',
        query: 'from=2025/05/11',
        status: 422,
      },
      {
        name: '不正なto形式',
        query: 'to=2025/05/11',
        status: 422,
      },
      {
        name: 'fromがtoより後の日付',
        query: 'from=2025-05-12&to=2025-05-11',
        status: 422,
      },
    ]

    it.each(testCases)('$name', async ({ query, status }) => {
      const res = await requestGetArticles(query)
      expect(res.status).toBe(status)
    })
  })

  describe('異常系', () => {
    it('検索でリポジトリ障害が発生した場合は500を返す', async () => {
      const actual = await vi.importActual<typeof ArticleModule>('@trend-diary/domain/article')
      vi.mocked(createArticleUseCase).mockImplementationOnce((rdb) => {
        const useCase = actual.createArticleUseCase(rdb)
        useCase.searchArticles = () => Promise.resolve(err(new Error('検索に失敗しました')))
        return useCase
      })

      const res = await requestGetArticles()
      expect(res.status).toBe(500)
    })
  })
})

describe('GET /api/articles 既読情報', () => {
  let authCookies: string
  const createdArticleIds: bigint[] = []
  const createdUserIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    const staleTitles = ['既読記事', '未読記事', 'スキップ記事']
    const staleArticles = await db
      .select({ articleId: articles.articleId })
      .from(articles)
      .where(inArray(articles.title, staleTitles))
    const staleArticleIds = staleArticles.map((article) => article.articleId)
    if (staleArticleIds.length > 0) {
      await db.delete(readHistories).where(inArray(readHistories.articleId, staleArticleIds))
    }
    await db.delete(articles).where(inArray(articles.title, staleTitles))

    // アカウント作成・ログイン
    const { userId, authenticationId } = await userHelper.create(
      'readtest@example.com',
      'Test@password123',
    )
    createdUserIds.userIds.push(userId)
    createdUserIds.authIds.push(authenticationId)

    const loginData = await userHelper.login('readtest@example.com', 'Test@password123')
    const testActiveUserId = loginData.activeUserId
    authCookies = loginData.cookies

    // テスト記事作成
    const article1 = await articleHelper.createArticle({
      title: '既読記事',
      author: 'テスト著者1',
    })
    createdArticleIds.push(article1.articleId)

    const article2 = await articleHelper.createArticle({
      title: '未読記事',
      author: 'テスト著者2',
    })
    createdArticleIds.push(article2.articleId)

    // article1を既読にする
    await articleHelper.createReadHistory(testActiveUserId, article1.articleId)

    const skippedArticle = await articleHelper.createArticle({
      title: 'スキップ記事',
      author: 'テスト著者3',
    })
    createdArticleIds.push(skippedArticle.articleId)

    await articleHelper.createSkippedArticle(testActiveUserId, skippedArticle.articleId)
  })

  afterEach(async () => {
    await Promise.allSettled([
      userHelper.cleanUp(createdUserIds),
      articleHelper.cleanUp(createdArticleIds),
    ])
    createdUserIds.userIds.length = 0
    createdUserIds.authIds.length = 0
    createdArticleIds.length = 0
  })

  it('未ログインの場合はisReadがundefined', async () => {
    // 認証状態をログアウトにする
    await userHelper.logout()

    const res = await requestGetArticles()
    expect(res.status).toBe(200)
    const data: ArticleListResponse = await res.json()
    expect(data.data).toHaveLength(3)
    expect(data.data.map((article) => article.title)).toEqual([
      'スキップ記事',
      '未読記事',
      '既読記事',
    ])
    for (const article of data.data) {
      expect(article.isRead).toBeUndefined()
    }
  })

  it('ログイン時は既読記事にisRead: trueが返される', async () => {
    const res = await requestGetArticles('title=既読記事', authCookies)

    expect(res.status).toBe(200)
    const data: { data: ArticleWithReadStatusResponse[] } = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.data[0].isRead).toBe(true)
  })

  it('ログイン時は未読記事にisRead: falseが返される', async () => {
    const res = await requestGetArticles('title=未読記事', authCookies)

    expect(res.status).toBe(200)
    const data: { data: ArticleWithReadStatusResponse[] } = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.data[0].isRead).toBe(false)
  })

  it('ログイン時はスキップ済み記事が一覧に含まれない', async () => {
    const res = await requestGetArticles('', authCookies)

    expect(res.status).toBe(200)
    const data: { data: ArticleWithReadStatusResponse[] } = await res.json()
    expect(data.data.map((article) => article.title)).toEqual(['未読記事', '既読記事'])
  })

  it('ログイン時にread_status=0を指定すると未読記事のみ返る', async () => {
    const res = await requestGetArticles('read_status=0', authCookies)

    expect(res.status).toBe(200)
    const data: { data: ArticleWithReadStatusResponse[] } = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.data[0].title).toBe('未読記事')
    expect(data.data[0].isRead).toBe(false)
  })
})
