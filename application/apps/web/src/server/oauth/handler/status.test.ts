import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

describe('GitHub連携状態の取得', () => {
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  describe('正常系', () => {
    it('github連携済みなら連携ありとして返す', async () => {
      const email = 'oauth-github-status-linked@example.com'
      const { userId, authenticationId } = await userHelper.createWithGithub(email, TEST_PASSWORD)
      createdIds.userIds.push(userId)
      createdIds.authIds.push(authenticationId)
      const { cookies } = await userHelper.login(email, TEST_PASSWORD)

      const res = await apiRequest('/api/oauth/github', { cookies })

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ linked: true })
    })

    it('github未連携なら連携なしとして返す', async () => {
      const email = 'oauth-github-status-unlinked@example.com'
      const { userId, authenticationId } = await userHelper.create(email, TEST_PASSWORD)
      createdIds.userIds.push(userId)
      createdIds.authIds.push(authenticationId)
      const { cookies } = await userHelper.login(email, TEST_PASSWORD)

      const res = await apiRequest('/api/oauth/github', { cookies })

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ linked: false })
    })
  })

  describe('準正常系', () => {
    it('未ログインでは認可されない', async () => {
      const res = await apiRequest('/api/oauth/github')

      expect(res.status).toBe(401)
    })
  })
})
