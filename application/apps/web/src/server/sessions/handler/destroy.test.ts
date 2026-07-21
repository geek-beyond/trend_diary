import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

async function requestSessionDeletion() {
  return apiRequest('/api/sessions', { method: 'DELETE', contentTypeJson: true })
}

describe('DELETE /api/sessions', () => {
  const TEST_EMAIL = 'logout-test@example.com'
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

  it('正常系: ログアウトに成功する', async () => {
    const res = await requestSessionDeletion()
    expect(res.status).toBe(204)
  })

  it('準正常系: ログインしていない状態でもエラーにならない', async () => {
    // ログアウト後に再度ログアウト
    await userHelper.logout()
    const res = await requestSessionDeletion()
    // ログインしていなくても204を返す（冪等性）
    expect(res.status).toBe(204)
  })
})
