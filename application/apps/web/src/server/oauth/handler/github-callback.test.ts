import { apiRequest } from '@/test/helper/request'

// GitHub本体のコード発行は外部サービスのため通せない。ここでは認可拒否・検証情報のない不正codeなど、
// フロー種別に応じた戻り先の振り分けを検証する
describe('GitHub OAuthコールバック', () => {
  describe('準正常系', () => {
    it.each([
      {
        name: 'codeなしの失敗はエラー種別を添えてログイン画面へ戻す',
        path: '/api/oauth/github/callback?error=access_denied',
        cookies: undefined,
        location: '/login?oauthError=github',
      },
      {
        name: '連携フローの失敗はログイン状態を保ったまま設定画面へ戻す',
        path: '/api/oauth/github/callback?error=access_denied',
        cookies: 'oauth_flow=link; oauth_redirect_to=%2Fsettings',
        location: '/settings?oauthError=github',
      },
      {
        name: '戻り先が設定画面でもログインフローの失敗はログイン画面へ戻す',
        path: '/api/oauth/github/callback?error=access_denied',
        cookies: 'oauth_flow=login; oauth_redirect_to=%2Fsettings',
        location: '/login?oauthError=github',
      },
      {
        name: '検証情報のない不正なcodeはログイン画面へ戻す',
        path: '/api/oauth/github/callback?code=invalid-code',
        cookies: undefined,
        location: '/login?oauthError=github',
      },
    ])('$name', async ({ path, cookies, location }) => {
      const res = await apiRequest(path, { cookies })

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe(location)
    })
  })
})
