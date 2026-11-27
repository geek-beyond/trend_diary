import { OAuthClient } from '@trend-diary/authentication'
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
    vi.restoreAllMocks()
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
      const status = await apiRequest('/api/oauth/github', { cookies })
      expect(status.status).toBe(200)
      expect(await status.json()).toEqual({ linked: false })
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
    it('GitHubが唯一のログイン手段なら400を返し、SDKに連携解除を依頼しない', async () => {
      const email = 'oauth-github-unlink-only@example.com'
      const { userId, authenticationId } = await userHelper.createWithGithub(email, TEST_PASSWORD)
      createdIds.userIds.push(userId)
      createdIds.authIds.push(authenticationId)
      const { cookies } = await userHelper.login(email, TEST_PASSWORD)

      // passwordで準備するfixtureでも、GitHubだけが残る場合のロックアウト防止を検証するため。
      const listIdentities = OAuthClient.prototype.listIdentities
      vi.spyOn(OAuthClient.prototype, 'listIdentities').mockImplementationOnce(async function (
        this: OAuthClient,
      ) {
        return (await listIdentities.call(this)).map((identities) =>
          identities.filter((identity) => identity.provider === 'github'),
        )
      })
      const unlinkIdentity = vi.spyOn(OAuthClient.prototype, 'unlinkIdentity')

      const res = await deleteUnlink(cookies)

      expect(res.status).toBe(400)
      expect(unlinkIdentity).not.toHaveBeenCalled()
    })

    it('未ログインでは認可されない', async () => {
      const res = await deleteUnlink()

      expect(res.status).toBe(401)
    })
  })
})
