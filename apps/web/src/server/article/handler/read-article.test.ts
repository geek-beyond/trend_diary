import { faker } from '@faker-js/faker'
import * as articleHelper from '@/test/helper/article'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'
import { articleIdParamSchema, createReadHistoryApiSchema } from './read-article'

async function requestReadArticle(articleId: string, cookies: string, readAt?: string) {
  return apiRequest(`/api/articles/${articleId}/read`, {
    method: 'POST',
    cookies,
    json: { read_at: readAt || faker.date.recent().toISOString() },
  })
}

describe('API ReadHistoryスキーマ', () => {
  describe('createReadHistoryApiSchema', () => {
    const MS_PER_MINUTE = 60 * 1000
    const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE

    describe('正常系', () => {
      const validCases = [
        { name: '現在時刻付近のISO8601文字列を受け入れること', read_at: new Date().toISOString() },
        {
          name: '時計ずれ許容内の近未来（数分先）を受け入れること',
          read_at: new Date(Date.now() + 2 * MS_PER_MINUTE).toISOString(),
        },
        {
          name: 'ダイアリー窓内の過去日時を受け入れること',
          read_at: new Date(Date.now() - 1 * MS_PER_DAY).toISOString(),
        },
      ]

      it.each(validCases)('$name', ({ read_at }) => {
        expect(() => {
          createReadHistoryApiSchema.parse({ read_at })
        }).not.toThrow()
      })
    })

    describe('準正常系', () => {
      const invalidCases = [
        { name: 'パースできない日時文字列を拒否すること', input: { read_at: 'invalid-date' } },
        { name: '時刻を含まない日付のみを拒否すること', input: { read_at: '2024-01-01' } },
        {
          name: '許容を超える未来日時を拒否すること',
          input: { read_at: new Date(Date.now() + 1 * MS_PER_DAY).toISOString() },
        },
        {
          name: 'ダイアリー窓を超える過去日時を拒否すること',
          input: { read_at: new Date(Date.now() - 8 * MS_PER_DAY).toISOString() },
        },
        { name: 'read_atフィールドが欠落している場合を拒否すること', input: {} },
      ]

      it.each(invalidCases)('$name', ({ input }) => {
        expect(() => {
          createReadHistoryApiSchema.parse(input)
        }).toThrow()
      })
    })
  })

  describe('articleIdParamSchema', () => {
    it('有効な数値文字列をbigintに変換すること', () => {
      const result = articleIdParamSchema.parse({
        article_id: '123456789',
      })

      expect(result.article_id).toBe(123456789n)
    })

    it('無効な文字列を拒否すること', () => {
      expect(() => {
        articleIdParamSchema.parse({
          article_id: 'not-a-number',
        })
      }).toThrow()

      expect(() => {
        articleIdParamSchema.parse({
          article_id: '',
        })
      }).toThrow()
    })

    it('article_idフィールドが必須であること', () => {
      expect(() => {
        articleIdParamSchema.parse({})
      }).toThrow()
    })

    // DB の ID は safe integer 範囲が契約。範囲外を toDbId の RangeError（500 と障害通知）に
    // 化けさせず、バリデーションエラーとして拒否する
    it('safe integer を超える値を拒否すること', () => {
      const overMax = (BigInt(Number.MAX_SAFE_INTEGER) + 1n).toString()

      expect(() => {
        articleIdParamSchema.parse({ article_id: overMax })
      }).toThrow('article_id is out of range')
    })

    it('safe integer 上限ちょうどの値は受け入れること', () => {
      const max = BigInt(Number.MAX_SAFE_INTEGER).toString()

      const result = articleIdParamSchema.parse({ article_id: max })

      expect(result.article_id).toBe(BigInt(Number.MAX_SAFE_INTEGER))
    })
  })
})

describe('POST /api/articles/:article_id/read', () => {
  let testActiveUserId: bigint
  let testArticleId: bigint
  let authCookies: string
  const createdArticleIds: bigint[] = []
  const createdUserIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    // アカウント作成・ログイン
    const { userId, authenticationId } = await userHelper.create(
      'read-article-test@example.com',
      'Test@password123',
    )
    createdUserIds.userIds.push(userId)
    createdUserIds.authIds.push(authenticationId)

    const loginData = await userHelper.login('read-article-test@example.com', 'Test@password123')
    testActiveUserId = loginData.activeUserId
    authCookies = loginData.cookies

    // テスト記事作成
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

  describe('正常系', () => {
    it('既読履歴を作成できること', async () => {
      // ダイアリー窓内かつ未来でない固定時刻（1時間前）で登録する
      const fixedReadAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const response = await requestReadArticle(testArticleId.toString(), authCookies, fixedReadAt)

      expect(response.status).toBe(201)
      const json: { message: string } = await response.json()
      expect(json.message).toBe('記事を既読にしました')

      // DBに実際に記録されていることを確認
      const readHistory = await articleHelper.findReadHistory(testActiveUserId, testArticleId)
      expect(readHistory).toBeTruthy()
      expect(readHistory!.readAt).toEqual(new Date(fixedReadAt))
    })
  })

  describe('準正常系', () => {
    it('無効なarticle_idでバリデーションエラーが発生すること', async () => {
      const response = await requestReadArticle('invalid-id', authCookies)

      expect(response.status).toBe(422)
    })
    it('無効なreadAtでバリデーションエラーが発生すること', async () => {
      const response = await requestReadArticle(
        testArticleId.toString(),
        authCookies,
        'invalid-date',
      )

      expect(response.status).toBe(422)
    })
    it('存在しない記事は既読履歴が作成できない', async () => {
      const nonExistentArticleId = '999999'

      const response = await requestReadArticle(nonExistentArticleId, authCookies)

      expect(response.status).toBe(404)
    })
  })

  describe('クロスユーザー認可', () => {
    // セッション由来のactiveUserIdで既読履歴を作成する不変条件を担保する。
    // 将来リクエストパラメータからユーザーIDを受け取る変更が入った際に検知できるようにする。
    it('ユーザーAの既読化が他ユーザーの既読履歴に影響しないこと', async () => {
      const userB = await userHelper.create('read-cross-user@example.com', 'Test@password123')
      createdUserIds.userIds.push(userB.userId)
      createdUserIds.authIds.push(userB.authenticationId)

      const response = await requestReadArticle(testArticleId.toString(), authCookies)
      expect(response.status).toBe(201)

      expect(await articleHelper.findReadHistory(testActiveUserId, testArticleId)).toBeTruthy()
      expect(await articleHelper.findReadHistory(userB.activeUserId, testArticleId)).toBeNull()
    })
  })
})
