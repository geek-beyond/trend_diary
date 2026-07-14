import type { AuthError } from '@supabase/supabase-js'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'
import { isInvalidCredentialsError } from './login'

describe('POST /api/auth/login', () => {
  const TEST_EMAIL = 'login-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    // テスト用ユーザーを作成
    const { userId, authenticationId } = await userHelper.create(TEST_EMAIL, TEST_PASSWORD)
    createdIds.userIds.push(userId)
    createdIds.authIds.push(authenticationId)
  })

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  async function requestLogin(body: string) {
    return apiRequest('/api/auth/login', { method: 'POST', body, contentTypeJson: true })
  }

  it('正常系: ログインに成功する', async () => {
    const res = await requestLogin(JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }))

    expect(res.status).toBe(200)
    const body: { displayName: string | null } = await res.json()
    expect(body).toHaveProperty('displayName')
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
      {
        name: 'パスワードが間違っている',
        input: { email: TEST_EMAIL, password: 'Wrong@password123' },
        status: 401,
      },
      {
        name: '存在しないユーザー',
        input: { email: 'nonexistent@example.com', password: 'Test@password123' },
        status: 401,
      },
    ]

    testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        const res = await requestLogin(JSON.stringify(testCase.input))
        expect(res.status).toBe(testCase.status)
      })
    })
  })
})

describe('isInvalidCredentialsError', () => {
  // 本番GoTrueとsupa-emuで返るエラー形が異なっても、資格情報の誤りを同一に判定できることを担保する
  const testCases: Array<{
    name: string
    error: Pick<AuthError, 'code' | 'message'>
    expected: boolean
  }> = [
    {
      name: '準正常系: 本番GoTrue(code=invalid_credentials)を資格情報エラーと判定する',
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
      expected: true,
    },
    {
      name: '準正常系: supa-emu(codeなし・OAuth形式)を資格情報エラーと判定する',
      error: { code: undefined, message: 'Invalid login credentials' },
      expected: true,
    },
    {
      name: '異常系: 資格情報エラー以外は判定しない',
      error: { code: 'over_request_rate_limit', message: 'Request rate limit reached' },
      expected: false,
    },
  ]

  testCases.forEach((testCase) => {
    it(testCase.name, () => {
      expect(isInvalidCredentialsError(testCase.error)).toBe(testCase.expected)
    })
  })
})
