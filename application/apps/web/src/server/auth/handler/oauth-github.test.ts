import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

function get(path: string, cookies?: string) {
  return apiRequest(path, { method: 'GET', cookies })
}

function getSetCookies(res: Response): string[] {
  return res.headers.getSetCookie()
}

// GitHub本体の認可画面〜コード発行は外部サービスのため通せない。ここでは認可URLの発行・
// リダイレクト先の妥当性・認証ガードなど、アプリ側で完結する境界のみを検証する
describe('GitHub OAuth認証', () => {
  describe('正常系', () => {
    it('ログイン開始でSupabaseのGitHub認可URLへリダイレクトする', async () => {
      const res = await get('/api/auth/oauth/github/login')

      expect(res.status).toBe(302)
      const location = res.headers.get('Location') ?? ''
      expect(location).toContain('/auth/v1/authorize')
      expect(location).toContain('provider=github')
    })

    it('redirectクエリが内部パスなら戻り先Cookieに保存する', async () => {
      const res = await get('/api/auth/oauth/github/login?redirect=%2Fsettings')

      expect(res.status).toBe(302)
      const redirectCookie = getSetCookies(res).find((cookie) =>
        cookie.startsWith('oauth_redirect_to='),
      )
      expect(redirectCookie).toContain('oauth_redirect_to=%2Fsettings')
      expect(redirectCookie).toContain('HttpOnly')
    })
  })

  describe('準正常系', () => {
    it('codeなしのcallbackはエラー種別を添えてログイン画面へ戻す', async () => {
      const res = await get('/api/auth/oauth/github/callback?error=access_denied')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/login?oauthError=github')
    })

    it('連携フロー(戻り先が設定画面)の失敗はログイン状態を保ったまま設定画面へ戻す', async () => {
      const res = await get(
        '/api/auth/oauth/github/callback?error=access_denied',
        'oauth_redirect_to=%2Fsettings',
      )

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/settings?oauthError=github')
    })

    it('検証情報のない不正なcodeのcallbackはログイン画面へ戻す', async () => {
      const res = await get('/api/auth/oauth/github/callback?code=invalid-code')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/login?oauthError=github')
    })

    it('redirectクエリが外部URLなら戻り先Cookieに保存しない', async () => {
      const res = await get(
        '/api/auth/oauth/github/login?redirect=https%3A%2F%2Fevil.example.com%2F',
      )

      expect(res.status).toBe(302)
      const redirectCookie = getSetCookies(res).find((cookie) =>
        cookie.startsWith('oauth_redirect_to='),
      )
      expect(redirectCookie).toBeUndefined()
    })

    it.each([
      { name: '連携開始', method: 'GET', path: '/api/auth/oauth/github/link' },
      { name: '連携状態の取得', method: 'GET', path: '/api/auth/oauth/github' },
      { name: '連携解除', method: 'DELETE', path: '/api/auth/oauth/github' },
    ])('未ログインでの$nameは401を返す', async ({ method, path }) => {
      // Content-Type未指定だとcsrf()がtext/plain扱いでDELETEを403にするため、JSONを明示する
      const res = await apiRequest(path, { method, contentTypeJson: true })

      expect(res.status).toBe(401)
    })
  })

  // ログイン済みユーザーが必要なケースだけユーザーを作成する
  describe('ログイン済みユーザーの連携管理', () => {
    const TEST_EMAIL = 'oauth-github-test@example.com'
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

    it('未連携の連携状態はlinked=falseを返す', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const res = await get('/api/auth/oauth/github', cookies)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ linked: false })
    })

    it('未連携での解除は何もせず204を返す', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const res = await apiRequest('/api/auth/oauth/github', {
        method: 'DELETE',
        cookies,
        contentTypeJson: true,
      })

      expect(res.status).toBe(204)
    })
  })
})
