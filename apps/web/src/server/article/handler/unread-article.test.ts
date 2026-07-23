import * as articleHelper from '@/test/helper/article'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

async function requestUnreadArticle(articleId: string, cookies: string) {
  // ブラウザは同一オリジンの状態変更リクエストにOriginを付与するため、CSRFミドルウェアを通すよう再現する
  return apiRequest(`/api/articles/${articleId}/unread`, {
    method: 'DELETE',
    cookies,
    origin: 'http://localhost',
  })
}

describe('DELETE /api/articles/:article_id/unread', () => {
  let testActiveUserId: bigint
  let testArticleId: bigint
  let authCookies: string
  const createdArticleIds: bigint[] = []
  const createdUserIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    // アカウント作成・ログイン
    const { userId, authenticationId } = await userHelper.create(
      'unread-article-test@example.com',
      'Test@password123',
    )
    createdUserIds.userIds.push(userId)
    createdUserIds.authIds.push(authenticationId)

    const loginData = await userHelper.login('unread-article-test@example.com', 'Test@password123')
    testActiveUserId = loginData.activeUserId
    authCookies = loginData.cookies

    // テスト記事作成
    const article = await articleHelper.createArticle()
    testArticleId = article.articleId
    createdArticleIds.push(article.articleId)

    // 既読履歴を事前に作成（削除テスト用）
    await articleHelper.createReadHistory(
      testActiveUserId,
      testArticleId,
      new Date('2024-01-01T10:00:00Z'),
    )
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
    it('既読履歴を削除できること', async () => {
      // 事前に既読履歴があることを確認
      const beforeCount = await articleHelper.countReadHistories(testActiveUserId, testArticleId)
      expect(beforeCount).toBe(1)

      const response = await requestUnreadArticle(testArticleId.toString(), authCookies)

      expect(response.status).toBe(200)

      // DBから実際に削除されていることを確認
      const afterCount = await articleHelper.countReadHistories(testActiveUserId, testArticleId)
      expect(afterCount).toBe(0)
    })

    it('既読履歴がなくてもOK', async () => {
      // 既読履歴を削除
      await articleHelper.deleteReadHistory(testActiveUserId, testArticleId)

      const response = await requestUnreadArticle(testArticleId.toString(), authCookies)

      expect(response.status).toBe(200)

      // DBから実際に削除されていることを確認
      const afterCount = await articleHelper.countReadHistories(testActiveUserId, testArticleId)
      expect(afterCount).toBe(0)
    })
  })

  describe('準正常系', () => {
    it('無効なarticle_idでバリデーションエラーが発生すること', async () => {
      const response = await requestUnreadArticle('invalid-id', authCookies)

      expect(response.status).toBe(422)
    })

    it('記事が存在しない場合はエラー', async () => {
      // 記事を削除
      await articleHelper.deleteArticle(testArticleId)

      const response = await requestUnreadArticle(testArticleId.toString(), authCookies)
      expect(response.status).toBe(404)
    })
  })

  describe('クロスユーザー認可', () => {
    // 削除対象をセッション由来のactiveUserIdに限定する不変条件を担保する。
    // 将来リクエストパラメータからユーザーIDを受け取る変更が入った際に検知できるようにする。
    it('他ユーザーBによる未読化がユーザーAの既読履歴を削除しないこと', async () => {
      const userB = await userHelper.create('unread-cross-user@example.com', 'Test@password123')
      createdUserIds.userIds.push(userB.userId)
      createdUserIds.authIds.push(userB.authenticationId)
      const userBLogin = await userHelper.login('unread-cross-user@example.com', 'Test@password123')

      const response = await requestUnreadArticle(testArticleId.toString(), userBLogin.cookies)
      expect(response.status).toBe(200)

      expect(await articleHelper.countReadHistories(testActiveUserId, testArticleId)).toBe(1)
    })
  })
})
