import TEST_ENV from '@/test/env'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'
import app from '../../../server'

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
    return app.request(
      '/api/auth/login',
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

  it('正常系: ログインに成功する', async () => {
    const res = await requestLogin(JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }))

    expect(res.status).toBe(200)
    const body = (await res.json()) as { displayName: string | null }
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
