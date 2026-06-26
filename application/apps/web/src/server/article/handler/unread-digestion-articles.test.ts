import app from '@/server'
import TEST_ENV from '@/test/env'
import * as articleHelper from '@/test/helper/article'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

interface UnreadDigestionResponse {
  data: Array<{
    articleId: string
    title: string
  }>
  total: number
}

describe('GET /api/articles/unread-digestion', () => {
  let testActiveUserId: bigint
  let authCookies: string
  const createdArticleIds: bigint[] = []
  const createdUserIds: CleanUpIds = { userIds: [], authIds: [] }

  async function requestUnreadDigestion(query?: string, cookies?: string) {
    const suffix = query ? `?${query}` : ''
    const headers: Record<string, string> = {}
    if (cookies) {
      headers.Cookie = cookies
    }
    return app.request(
      `/api/articles/unread-digestion${suffix}`,
      {
        method: 'GET',
        headers,
      },
      TEST_ENV,
    )
  }

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

  it.each([
    {
      name: '当日未読かつ未skipの記事のみ返す',
      query: undefined,
      cookies: () => authCookies,
      status: 200,
      expectedTitles: ['未読消化対象', '未読消化対象Zenn'],
    },
    {
      name: 'media=qiita指定時はqiitaのみ返す',
      query: 'media=qiita',
      cookies: () => authCookies,
      status: 200,
      expectedTitles: ['未読消化対象'],
    },
    {
      name: '未認証時は401',
      query: undefined,
      cookies: () => undefined,
      status: 401,
      expectedTitles: undefined,
    },
    {
      name: '不正なmediaは422',
      query: 'media=invalid',
      cookies: () => authCookies,
      status: 422,
      expectedTitles: undefined,
    },
  ])('$name', async ({ query, cookies, status, expectedTitles }) => {
    const response = await requestUnreadDigestion(query, cookies())
    expect(response.status).toBe(status)

    if (status !== 200) return

    const json: UnreadDigestionResponse = await response.json()
    expect(json.data.map((item) => item.title)).toEqual(expect.arrayContaining(expectedTitles!))
    expect(json.data).toHaveLength(expectedTitles!.length)
    expect(json.total).toBe(expectedTitles!.length)
  })
})
