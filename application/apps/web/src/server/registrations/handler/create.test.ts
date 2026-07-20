import { apiRequest } from '@/test/helper/request'
import * as userHelper from '@/test/helper/user'

async function requestRegistration(body: string) {
  return apiRequest('/api/registrations', { method: 'POST', body, contentTypeJson: true })
}

describe('POST /api/registrations', () => {
  let emailSequence = 0
  const nextEmail = (prefix: string) => {
    emailSequence += 1
    return `${prefix}+${Date.now()}-${emailSequence}@test.com`
  }

  // 登録APIで使用するメールのパターン
  const SIGNUP_TEST_EMAIL_PATTERN = '@test.com'
  const DUPLICATE_EMAIL_PATTERN = 'duplicate@example.com'

  beforeEach(async () => {
    // 登録APIで直接作成されたユーザーをクリーンアップ
    await userHelper.cleanUpByEmailPattern(SIGNUP_TEST_EMAIL_PATTERN)
    await userHelper.cleanUpByEmailPattern(DUPLICATE_EMAIL_PATTERN)
  })

  afterAll(async () => {
    await userHelper.cleanUpByEmailPattern(SIGNUP_TEST_EMAIL_PATTERN)
    await userHelper.cleanUpByEmailPattern(DUPLICATE_EMAIL_PATTERN)
  })

  it('正常系: 登録が成功する', async () => {
    const email = nextEmail('signup')
    const res = await requestRegistration(JSON.stringify({ email, password: 'Test@password123' }))

    expect(res.status).toBe(201)
    const body: Record<string, never> = await res.json()
    expect(body).toEqual({})
  })

  describe('準正常系', () => {
    const testCases: Array<{
      name: string
      input: { email: string; password: string }
      status: number
    }> = [
      {
        name: '不正なメールアドレス',
        input: { email: 'invalid-email', password: 'Test@password123' },
        status: 422,
      },
      {
        name: '不正なパスワード（短すぎる）',
        input: { email: 'test@test.com', password: 'abc' },
        status: 422,
      },
    ]

    testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const res = await requestRegistration(JSON.stringify(testCase.input))
        expect(res.status).toBe(testCase.status)
      })
    })

    it('既に存在するメールアドレスの場合', async () => {
      const email = nextEmail('duplicate')

      // 1回目の登録
      const res1 = await requestRegistration(
        JSON.stringify({ email, password: 'Test@password123' }),
      )
      expect(res1.status).toBe(201)

      // 2回目の登録
      const res2 = await requestRegistration(
        JSON.stringify({ email, password: 'Test@password123' }),
      )
      expect(res2.status).toBe(409)
    })
  })
})
