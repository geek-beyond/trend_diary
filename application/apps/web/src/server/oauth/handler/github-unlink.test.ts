import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

describe('GitHub連携解除', () => {
  describe('正常系', () => {
    const TEST_EMAIL = 'oauth-github-unlink-test@example.com'
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

    // 未連携ユーザーは早期returnで204を返すno-opパス。連携済みを前提とする実DELETE解除は
    // OAuthフル往復が必要なため、ドメインのユニットテストで担保する
    it('未連携なら何もせず204を返す', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const res = await apiRequest('/api/oauth/github', {
        method: 'DELETE',
        cookies,
        contentTypeJson: true,
      })

      expect(res.status).toBe(204)
    })
  })

  describe('準正常系', () => {
    it('未ログインでは401を返す', async () => {
      // Content-Type未指定だとcsrf()がtext/plain扱いでDELETEを403にするため、JSONを明示する
      const res = await apiRequest('/api/oauth/github', { method: 'DELETE', contentTypeJson: true })

      expect(res.status).toBe(401)
    })
  })
})
