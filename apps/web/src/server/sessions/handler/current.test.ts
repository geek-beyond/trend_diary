import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

async function requestCurrent(cookies?: string) {
  return apiRequest('/api/sessions/current', { method: 'GET', cookies, contentTypeJson: true })
}

describe('GET /api/sessions/current', () => {
  const TEST_EMAIL = 'me-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    // ユーザーを作成
    const { userId, authenticationId } = await userHelper.create(TEST_EMAIL, TEST_PASSWORD)
    createdIds.userIds.push(userId)
    createdIds.authIds.push(authenticationId)
  })

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  it('正常系: 現在のユーザー情報を取得できる', async () => {
    const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

    // ユーザー情報取得（クッキーを渡す）
    const currentRes = await requestCurrent(cookies)
    expect(currentRes.status).toBe(200)

    const body: { user: { displayName: string | null } } = await currentRes.json()
    expect(body).toHaveProperty('user')
    expect(body.user).toHaveProperty('displayName')
  })

  it('準正常系: ログインしていない場合は401を返す', async () => {
    const res = await requestCurrent()
    expect(res.status).toBe(401)
  })

  it('準正常系: ログアウト後は401を返す', async () => {
    await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

    // ログアウト（クッキーなしでリクエスト）
    const res = await requestCurrent()
    expect(res.status).toBe(401)
  })
})
