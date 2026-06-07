import TEST_ENV from '@/test/env'
import * as userHelper from '@/test/helper/user'
import app from '../../../server'

describe('POST /api/auth/signup', () => {
  let emailSequence = 0
  const nextEmail = (prefix: string) => {
    emailSequence += 1
    return `${prefix}+${Date.now()}-${emailSequence}@test.com`
  }

  // signup APIで使用するメールのパターン
  const SIGNUP_TEST_EMAIL_PATTERN = '@test.com'
  const DUPLICATE_EMAIL_PATTERN = 'duplicate@example.com'

  beforeEach(async () => {
    // signup APIで直接作成されたユーザーをクリーンアップ
    await userHelper.cleanUpByEmailPattern(SIGNUP_TEST_EMAIL_PATTERN)
    await userHelper.cleanUpByEmailPattern(DUPLICATE_EMAIL_PATTERN)
  })

  afterAll(async () => {
    await userHelper.cleanUpByEmailPattern(SIGNUP_TEST_EMAIL_PATTERN)
    await userHelper.cleanUpByEmailPattern(DUPLICATE_EMAIL_PATTERN)
  })

  async function requestSignup(body: string) {
    return app.request(
      '/api/auth/signup',
      {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      TEST_ENV,
    )
  }

  it('正常系: signupが成功する', async () => {
    const email = nextEmail('signup')
    const res = await requestSignup(JSON.stringify({ email, password: 'Test@password123' }))

    expect(res.status).toBe(201)
    const body = (await res.json()) as Record<string, never>
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
        const res = await requestSignup(JSON.stringify(testCase.input))
        expect(res.status).toBe(testCase.status)
      })
    })

    it('既に存在するメールアドレスの場合', async () => {
      const email = nextEmail('duplicate')

      // 1回目の登録
      const res1 = await requestSignup(JSON.stringify({ email, password: 'Test@password123' }))
      expect(res1.status).toBe(201)

      // 2回目の登録
      const res2 = await requestSignup(JSON.stringify({ email, password: 'Test@password123' }))
      expect(res2.status).toBe(409)
    })
  })
})
