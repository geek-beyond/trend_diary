import type * as ArticleModule from '@trend-diary/domain/article'
import { createArticleUseCase } from '@trend-diary/domain/article'
import { err } from 'neverthrow'
import { vi } from 'vitest'
import * as articleHelper from '@/test/helper/article'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

// getUnreadDigestionArticles は異常系テストでのみ失敗させたい。ただし vi.mock はファイル先頭へ
// ホイストされモジュールスコープにしか置けず、かつ異常系は共通のログイン(beforeEach)を再利用する
// ため describe 内にネストしている都合上、その直前には配置できないためここで宣言する。
// 正常系・準正常系は vi.fn で実装へ委譲するため挙動は変わらない。
vi.mock('@trend-diary/domain/article', async (importOriginal) => {
  const actual = await importOriginal<typeof ArticleModule>()
  return { ...actual, createArticleUseCase: vi.fn(actual.createArticleUseCase) }
})

interface UnreadDigestionResponse {
  data: Array<{
    articleId: string
    title: string
  }>
  total: number
}

async function requestUnreadDigestion(query?: string, cookies?: string) {
  const suffix = query ? `?${query}` : ''
  return apiRequest(`/api/articles/unread-digestion${suffix}`, { method: 'GET', cookies })
}

describe('GET /api/articles/unread-digestion', () => {
  let testActiveUserId: bigint
  let authCookies: string
  const createdArticleIds: bigint[] = []
  const createdUserIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    const { userId, authenticationId } = await userHelper.create(
      'unread-digest@example.com',
      'Test@password123',
    )
    createdUserIds.userIds.push(userId)
    createdUserIds.authIds.push(authenticationId)

    const loginData = await userHelper.login('unread-digest@example.com', 'Test@password123')
    testActiveUserId = loginData.activeUserId
    authCookies = loginData.cookies

    const unreadArticle = await articleHelper.createArticle({
      title: '未読消化対象',
      media: 'qiita',
    })
    createdArticleIds.push(unreadArticle.articleId)

    const unreadZennArticle = await articleHelper.createArticle({
      title: '未読消化対象Zenn',
      media: 'zenn',
    })
    createdArticleIds.push(unreadZennArticle.articleId)

    const readArticle = await articleHelper.createArticle({
      title: '既読記事',
    })
    createdArticleIds.push(readArticle.articleId)
    await articleHelper.createReadHistory(testActiveUserId, readArticle.articleId)

    const skippedArticle = await articleHelper.createArticle({
      title: 'スキップ記事',
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

  describe('正常系', () => {
    it.each([
      {
        name: '当日未読かつ未skipの記事のみ返す',
        query: undefined,
        expectedTitles: ['未読消化対象', '未読消化対象Zenn'],
      },
      {
        name: 'media=qiita指定時はqiitaのみ返す',
        query: 'media=qiita',
        expectedTitles: ['未読消化対象'],
      },
      {
        name: '複数media指定時は該当するすべての媒体を返す',
        query: 'media=qiita&media=zenn',
        expectedTitles: ['未読消化対象', '未読消化対象Zenn'],
      },
    ])('$name', async ({ query, expectedTitles }) => {
      const response = await requestUnreadDigestion(query, authCookies)
      expect(response.status).toBe(200)

      const json: UnreadDigestionResponse = await response.json()
      expect(json.data.map((item) => item.title)).toEqual(expect.arrayContaining(expectedTitles))
      expect(json.data).toHaveLength(expectedTitles.length)
      expect(json.total).toBe(expectedTitles.length)
    })
  })

  describe('準正常系', () => {
    it('未認証時は401', async () => {
      const response = await requestUnreadDigestion()
      expect(response.status).toBe(401)
    })

    it('不正なmediaは422', async () => {
      const response = await requestUnreadDigestion('media=invalid', authCookies)
      expect(response.status).toBe(422)
    })
  })

  describe('異常系', () => {
    it('取得でリポジトリ障害が発生した場合は500を返す', async () => {
      const actual = await vi.importActual<typeof ArticleModule>('@trend-diary/domain/article')
      vi.mocked(createArticleUseCase).mockImplementationOnce((rdb) => {
        const useCase = actual.createArticleUseCase(rdb)
        useCase.getUnreadDigestionArticles = () =>
          Promise.resolve(err(new Error('取得に失敗しました')))
        return useCase
      })

      const response = await requestUnreadDigestion(undefined, authCookies)
      expect(response.status).toBe(500)
    })
  })
})
