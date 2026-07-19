import { apiRequest, findSetCookie } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

// 連携開始は認可URLの発行までアプリ側で完結するため、リダイレクト先・フロー種別/戻り先Cookieと
// 認証ガードを検証する
describe('GitHub連携開始', () => {
  describe('正常系', () => {
    const TEST_EMAIL = 'oauth-github-link-test@example.com'
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

    it('SupabaseのGitHub認可URLへリダイレクトし、フロー種別と戻り先Cookieを保存する', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const res = await apiRequest('/api/oauth/github/link', { cookies })

      expect(res.status).toBe(302)
      const location = res.headers.get('Location') ?? ''
      expect(location).toContain('/auth/v1/authorize')
      expect(location).toContain('provider=github')

      expect(findSetCookie(res, 'oauth_flow=')).toContain('oauth_flow=link')
      expect(findSetCookie(res, 'oauth_redirect_to=')).toContain('oauth_redirect_to=%2Fsettings')
    })
  })

  describe('準正常系', () => {
    it('未ログインでは401を返す', async () => {
      const res = await apiRequest('/api/oauth/github/link')

      expect(res.status).toBe(401)
    })
  })
})
