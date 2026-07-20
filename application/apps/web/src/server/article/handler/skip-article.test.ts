import * as articleHelper from '@/test/helper/article'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

async function requestSkipArticle(articleId: string, cookies?: string) {
  // ブラウザは同一オリジンの状態変更リクエストにOriginを付与するため、CSRFミドルウェアを通すよう再現する
  return apiRequest(`/api/articles/${articleId}/skip`, {
    method: 'POST',
    cookies,
    origin: 'http://localhost',
  })
}

describe('POST /api/articles/:article_id/skip', () => {
  let testActiveUserId: bigint
  let testArticleId: bigint
  let authCookies: string
  const createdArticleIds: bigint[] = []
  const createdUserIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    const { userId, authenticationId } = await userHelper.create(
      'skiptest@example.com',
      'Test@password123',
    )
    createdUserIds.userIds.push(userId)
    createdUserIds.authIds.push(authenticationId)

    const loginData = await userHelper.login('skiptest@example.com', 'Test@password123')
    testActiveUserId = loginData.activeUserId
    authCookies = loginData.cookies

    const article = await articleHelper.createArticle()
    testArticleId = article.articleId
    createdArticleIds.push(article.articleId)
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

  it('記事をskipできること', async () => {
    const response = await requestSkipArticle(testArticleId.toString(), authCookies)

    expect(response.status).toBe(204)
  })

  it.each([
    {
      name: '無効なarticle_id',
      articleId: 'invalid-id',
      cookies: () => authCookies,
      status: 422,
    },
    {
      name: '未認証',
      articleId: '1',
      cookies: () => undefined,
      status: 401,
    },
  ])('$name で期待ステータスになる', async ({ articleId, cookies, status }) => {
    const response = await requestSkipArticle(articleId, cookies())
    expect(response.status).toBe(status)
  })

  describe('クロスユーザー認可', () => {
    // セッション由来のactiveUserIdでスキップ状態を作成する不変条件を担保する。
    // 将来リクエストパラメータからユーザーIDを受け取る変更が入った際に検知できるようにする。
    it('ユーザーAのスキップが他ユーザーのスキップ状態に影響しないこと', async () => {
      const userB = await userHelper.create('skip-cross-user@example.com', 'Test@password123')
      createdUserIds.userIds.push(userB.userId)
      createdUserIds.authIds.push(userB.authenticationId)

      const response = await requestSkipArticle(testArticleId.toString(), authCookies)
      expect(response.status).toBe(204)

      expect(await articleHelper.countSkippedArticles(testActiveUserId, testArticleId)).toBe(1)
      expect(await articleHelper.countSkippedArticles(userB.activeUserId, testArticleId)).toBe(0)
    })
  })
})
