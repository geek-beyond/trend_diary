import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

describe('PUT /api/auth/me/theme', () => {
  const TEST_EMAIL = 'update-theme-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    const { userId, authenticationId } = await userHelper.create(TEST_EMAIL, TEST_PASSWORD)
    createdIds.userIds.push(userId)
    createdIds.authIds.push(authenticationId)
  })

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  function putTheme(theme: unknown, cookies?: string) {
    return apiRequest('/api/auth/me/theme', { method: 'PUT', json: { theme }, cookies })
  }

  function requestMe(cookies?: string) {
    return apiRequest('/api/auth/me', { method: 'GET', cookies, contentTypeJson: true })
  }

  describe('正常系', () => {
    it('テーマを更新でき、その後の/meにも反映される', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const res = await putTheme('dark', cookies)
      expect(res.status).toBe(200)
      const body: { theme: string } = await res.json()
      expect(body.theme).toBe('dark')

      // 別リクエスト(=別端末相当)でも更新後のテーマが取得できる
      const meRes = await requestMe(cookies)
      const meBody: { user: { theme: string } } = await meRes.json()
      expect(meBody.user.theme).toBe('dark')
    })
  })

  describe('準正常系', () => {
    it('ログインしていない場合は401を返す', async () => {
      const res = await putTheme('dark')
      expect(res.status).toBe(401)
    })

    it('許可値以外のテーマは422を返す', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const res = await putTheme('blue', cookies)
      expect(res.status).toBe(422)
    })
  })
})
