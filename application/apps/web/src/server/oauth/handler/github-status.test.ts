import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

describe('GitHub連携状態の取得', () => {
  describe('正常系', () => {
    const TEST_EMAIL = 'oauth-github-status-test@example.com'
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

    it('未連携のユーザーはlinked=falseを返す', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const res = await apiRequest('/api/oauth/github', { cookies })

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ linked: false })
    })
  })

  describe('準正常系', () => {
    it('未ログインでは401を返す', async () => {
      const res = await apiRequest('/api/oauth/github')

      expect(res.status).toBe(401)
    })
  })
})
