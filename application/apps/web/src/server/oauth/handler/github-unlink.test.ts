import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

function deleteUnlink(cookies?: string) {
  // Content-Type未指定だとcsrf()がtext/plain扱いでDELETEを403にするため、JSONを明示する
  return apiRequest('/api/oauth/github', { method: 'DELETE', cookies, contentTypeJson: true })
}

describe('GitHub連携解除', () => {
  const TEST_EMAIL = 'oauth-github-unlink-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  describe('正常系', () => {
    it('他のログイン手段があれば連携を解除できる', async () => {
      const { userId, authenticationId } = await userHelper.createWithGithub(
        TEST_EMAIL,
        TEST_PASSWORD,
      )
      createdIds.userIds.push(userId)
      createdIds.authIds.push(authenticationId)
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const res = await deleteUnlink(cookies)

      expect(res.status).toBe(204)
    })

    it('未連携でも冪等に成功する', async () => {
      const email = 'oauth-github-unlink-none@example.com'
      const { userId, authenticationId } = await userHelper.create(email, TEST_PASSWORD)
      createdIds.userIds.push(userId)
      createdIds.authIds.push(authenticationId)
      const { cookies } = await userHelper.login(email, TEST_PASSWORD)

      const res = await deleteUnlink(cookies)

      expect(res.status).toBe(204)
    })
  })

  describe('準正常系', () => {
    it('未ログインでは認可されない', async () => {
      const res = await deleteUnlink()

      expect(res.status).toBe(401)
    })
  })
})
