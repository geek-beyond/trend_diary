import { addJstDays, toJstDateString } from '@trend-diary/std/locale/date'
import { z } from 'zod'
import * as articleHelper from '@/test/helper/article'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'
import { diaryQuerySchema } from './get-diary'

interface DiaryRangeResponse {
  data: Array<{
    date: string
    summary: {
      read: number
      skip: number
    }
    sources: Array<{
      media: string
      read: number
      skip: number
    }>
  }>
  reads?: {
    data: Array<{
      readHistoryId: string
      articleId: string
      media: string
      title: string
      url: string
      readAt: string
    }>
    page: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

function toJstDateTime(date: string, time: string) {
  return new Date(`${date}T${time}+09:00`)
}

async function requestDiaryRange(query?: string, cookies?: string) {
  const suffix = query ? `?${query}` : ''
  return apiRequest(`/api/articles/diary${suffix}`, { method: 'GET', cookies })
}

describe('diaryQuerySchema', () => {
  it('存在しない日付を拒否する', () => {
    const result = diaryQuerySchema.safeParse({
      from: '2026-02-30',
      to: '2026-02-30',
      page: 1,
    })
    expect(result.success).toBe(false)
    if (result.success) return

    const errors = z.flattenError(result.error).fieldErrors
    expect(errors.from).toContain('date must be a valid JST date')
    expect(errors.to).toContain('date must be a valid JST date')
  })

  it('page指定時にfromとtoが異なる日付を拒否する', () => {
    const result = diaryQuerySchema.safeParse({
      from: '2026-03-07',
      to: '2026-03-08',
      page: 1,
    })
    expect(result.success).toBe(false)
    if (result.success) return

    const errors = z.flattenError(result.error).fieldErrors
    expect(errors.page).toContain('page is available only when from and to are the same date')
  })
})

describe('GET /api/articles/diary (単日詳細)', () => {
  let authCookies: string
  let activeUserId: bigint
  let todayJst: string
  const createdArticleIds: bigint[] = []
  const createdUserIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    todayJst = toJstDateString(new Date())
    const { userId, authenticationId } = await userHelper.create(
      'diary-test@example.com',
      'Test@password123',
    )
    createdUserIds.userIds.push(userId)
    createdUserIds.authIds.push(authenticationId)

    const loginData = await userHelper.login('diary-test@example.com', 'Test@password123')
    authCookies = loginData.cookies
    activeUserId = loginData.activeUserId

    const qiitaArticle = await articleHelper.createArticle({
      media: 'qiita',
      title: 'Go error handling',
      createdAt: toJstDateTime(todayJst, '09:00:00'),
    })
    const zennArticle = await articleHelper.createArticle({
      media: 'zenn',
      title: 'Bun runtime',
      createdAt: toJstDateTime(todayJst, '09:30:00'),
    })
    createdArticleIds.push(qiitaArticle.articleId, zennArticle.articleId)

    await articleHelper.createReadHistory(
      activeUserId,
      qiitaArticle.articleId,
      toJstDateTime(todayJst, '10:00:00'),
    )
    await articleHelper.createReadHistory(
      activeUserId,
      qiitaArticle.articleId,
      toJstDateTime(todayJst, '10:05:00'),
    )
    await articleHelper.createReadHistory(
      activeUserId,
      zennArticle.articleId,
      toJstDateTime(todayJst, '11:00:00'),
    )
    await articleHelper.createSkippedArticle(activeUserId, zennArticle.articleId)
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

  it('指定日のダイアリー詳細を取得できる', async () => {
    const response = await requestDiaryRange(`from=${todayJst}&to=${todayJst}&page=1`, authCookies)

    expect(response.status).toBe(200)
    const json: DiaryRangeResponse = await response.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0]).toEqual({
      date: todayJst,
      summary: { read: 3, skip: 1 },
      sources: [
        { media: 'qiita', read: 2, skip: 0 },
        { media: 'zenn', read: 1, skip: 1 },
        { media: 'hatena', read: 0, skip: 0 },
      ],
    })
    expect(json.reads?.page).toBe(1)
    expect(json.reads?.data).toHaveLength(3)
    expect(json.reads?.data[0].title).toBe('Bun runtime')
  })

  it('page指定でread一覧をページングできる', async () => {
    const response = await requestDiaryRange(`from=${todayJst}&to=${todayJst}&page=2`, authCookies)

    expect(response.status).toBe(200)
    const json: DiaryRangeResponse = await response.json()
    expect(json.reads?.page).toBe(2)
    expect(json.reads?.data).toHaveLength(0)
    expect(json.reads?.hasPrev).toBe(true)
  })

  it('未認証時は401', async () => {
    const response = await requestDiaryRange(`from=${todayJst}&to=${todayJst}&page=1`)
    expect(response.status).toBe(401)
  })

  it('不正なdate形式は422', async () => {
    const response = await requestDiaryRange(`from=2026/03/07&to=2026/03/07&page=1`, authCookies)
    expect(response.status).toBe(422)
  })

  it('存在しない日付は422', async () => {
    const response = await requestDiaryRange(`from=2026-02-30&to=2026-02-30&page=1`, authCookies)
    expect(response.status).toBe(422)
    const json: { message: string } = await response.json()
    expect(json.message).toBe('Invalid input')
  })

  it('7日範囲外の日付は422', async () => {
    const tooOldDate = addJstDays(todayJst, -7)

    const response = await requestDiaryRange(
      `from=${tooOldDate}&to=${tooOldDate}&page=1`,
      authCookies,
    )
    expect(response.status).toBe(422)
  })

  it('未来日付は422', async () => {
    const tomorrow = addJstDays(todayJst, 1)

    const response = await requestDiaryRange(`from=${tomorrow}&to=${tomorrow}&page=1`, authCookies)
    expect(response.status).toBe(422)
  })

  it('page指定時にfromとtoが異なる場合は422', async () => {
    const yesterday = addJstDays(todayJst, -1)

    const response = await requestDiaryRange(`from=${yesterday}&to=${todayJst}&page=1`, authCookies)
    expect(response.status).toBe(422)
  })
})

describe('GET /api/articles/diary', () => {
  let authCookies: string
  let activeUserId: bigint
  let todayJst: string
  const createdArticleIds: bigint[] = []
  const createdUserIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    todayJst = toJstDateString(new Date())
    const { userId, authenticationId } = await userHelper.create(
      'diary-test-range@example.com',
      'Test@password123',
    )
    createdUserIds.userIds.push(userId)
    createdUserIds.authIds.push(authenticationId)

    const loginData = await userHelper.login('diary-test-range@example.com', 'Test@password123')
    authCookies = loginData.cookies
    activeUserId = loginData.activeUserId

    const qiitaArticle = await articleHelper.createArticle({
      media: 'qiita',
      title: 'Go error handling',
      createdAt: toJstDateTime(todayJst, '09:00:00'),
    })
    const zennArticle = await articleHelper.createArticle({
      media: 'zenn',
      title: 'Bun runtime',
      createdAt: toJstDateTime(todayJst, '09:30:00'),
    })
    createdArticleIds.push(qiitaArticle.articleId, zennArticle.articleId)

    await articleHelper.createReadHistory(
      activeUserId,
      qiitaArticle.articleId,
      toJstDateTime(todayJst, '10:00:00'),
    )
    await articleHelper.createReadHistory(
      activeUserId,
      qiitaArticle.articleId,
      toJstDateTime(todayJst, '10:05:00'),
    )
    await articleHelper.createSkippedArticle(activeUserId, zennArticle.articleId)
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

  it('指定期間のダイアリー集計を取得できる', async () => {
    const from = addJstDays(todayJst, -6)

    const response = await requestDiaryRange(`from=${from}&to=${todayJst}`, authCookies)

    expect(response.status).toBe(200)
    const json: DiaryRangeResponse = await response.json()
    expect(json.reads).toBeUndefined()
    expect(json.data).toHaveLength(7)
    const today = json.data.find((item) => item.date === todayJst)
    expect(today).toEqual({
      date: todayJst,
      summary: { read: 2, skip: 1 },
      sources: [
        { media: 'qiita', read: 2, skip: 0 },
        { media: 'zenn', read: 0, skip: 1 },
        { media: 'hatena', read: 0, skip: 0 },
      ],
    })
  })

  it('from > to は422', async () => {
    const from = addJstDays(todayJst, -1)

    const response = await requestDiaryRange(`from=${todayJst}&to=${from}`, authCookies)
    expect(response.status).toBe(422)
  })

  it('7日範囲外の期間は422', async () => {
    const from = addJstDays(todayJst, -7)

    const response = await requestDiaryRange(`from=${from}&to=${todayJst}`, authCookies)
    expect(response.status).toBe(422)
  })

  it('存在しない日付を含む期間は422', async () => {
    const response = await requestDiaryRange(`from=2026-02-30&to=${todayJst}`, authCookies)
    expect(response.status).toBe(422)
    const json: { message: string } = await response.json()
    expect(json.message).toBe('Invalid input')
  })

  it('未来日付を含む期間は422', async () => {
    const to = addJstDays(todayJst, 1)

    const response = await requestDiaryRange(`from=${todayJst}&to=${to}`, authCookies)
    expect(response.status).toBe(422)
  })

  it('未認証時は401', async () => {
    const from = addJstDays(todayJst, -6)

    const response = await requestDiaryRange(`from=${from}&to=${todayJst}`)
    expect(response.status).toBe(401)
  })
})
