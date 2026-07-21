import { apiRequest } from '@/test/helper/request'
import * as userHelper from '@/test/helper/user'

const TEST_PASSWORD = 'Test@password123'
const EMAIL_PREFIX = 'oauth-github-callback'

async function startGithubOAuth(loginHint: string): Promise<{ code: string; cookies: string }> {
  const loginRes = await apiRequest('/api/oauth/github/login')
  const cookies = loginRes.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

  const authorize = new URL(loginRes.headers.get('Location') ?? '')
  authorize.searchParams.set('login_hint', loginHint)
  const authorizeRes = await fetch(authorize, { redirect: 'manual' })

  const location = authorizeRes.headers.get('Location')
  if (!location) throw new Error(`authorize did not redirect: ${authorizeRes.status}`)
  const code = new URL(location).searchParams.get('code')
  if (!code) throw new Error(`authorize returned no code: ${location}`)

  return { code, cookies }
}

describe('GitHub OAuthコールバック', () => {
  afterEach(async () => {
    await userHelper.cleanUpByEmailPattern(EMAIL_PREFIX)
  })

  describe('正常系', () => {
    it('連携済みユーザーの認証に成功すると既定の遷移先へリダイレクトする', async () => {
      const email = `${EMAIL_PREFIX}-linked@example.com`
      await userHelper.create(email, TEST_PASSWORD)
      const { code, cookies } = await startGithubOAuth(email)

      const res = await apiRequest(`/api/oauth/github/callback?code=${code}`, { cookies })

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/trends')
    })

    it('未連携ユーザーの初回ログインは新規登録して既定の遷移先へリダイレクトする', async () => {
      const { code, cookies } = await startGithubOAuth(`${EMAIL_PREFIX}-new@example.com`)

      const res = await apiRequest(`/api/oauth/github/callback?code=${code}`, { cookies })

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/trends')
    })
  })

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
    ])('$name', async ({ path, cookies, location }) => {
      const res = await apiRequest(path, { cookies })

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe(location)
    })

    it('コード交換に失敗したらエラー種別を添えて元の画面へ戻す', async () => {
      const res = await apiRequest('/api/oauth/github/callback?code=not-issued')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/login?oauthError=github')
    })
  })
})
