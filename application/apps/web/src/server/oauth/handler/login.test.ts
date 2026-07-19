import { apiRequest, findSetCookie } from '@/test/helper/request'

// ログイン開始は認可URLの発行と戻り先/フロー種別Cookieの制御までアプリ側で完結するため、
// 外部サービスを通さずにこれらの境界を検証する
describe('GitHubログイン開始', () => {
  describe('正常系', () => {
    it('SupabaseのGitHub認可URLへリダイレクトする', async () => {
      const res = await apiRequest('/api/oauth/github/login')

      expect(res.status).toBe(302)
      const location = res.headers.get('Location') ?? ''
      expect(location).toContain('/auth/v1/authorize')
      expect(location).toContain('provider=github')
    })

    it('フロー種別Cookieにloginを保存する', async () => {
      const res = await apiRequest('/api/oauth/github/login')

      expect(res.status).toBe(302)
      expect(findSetCookie(res, 'oauth_flow=')).toContain('oauth_flow=login')
    })

    it('redirectクエリが内部パスなら戻り先Cookieに保存する', async () => {
      const res = await apiRequest('/api/oauth/github/login?redirect=%2Fsettings')

      expect(res.status).toBe(302)
      const redirectCookie = findSetCookie(res, 'oauth_redirect_to=')
      expect(redirectCookie).toContain('oauth_redirect_to=%2Fsettings')
      expect(redirectCookie).toContain('HttpOnly')
    })

    it('redirectクエリが無ければ残存する戻り先Cookieを削除する', async () => {
      const res = await apiRequest('/api/oauth/github/login')

      expect(res.status).toBe(302)
      expect(findSetCookie(res, 'oauth_redirect_to=')).toContain('Max-Age=0')
    })
  })

  describe('準正常系', () => {
    it('redirectクエリが外部URLなら戻り先Cookieに保存せず削除する', async () => {
      const res = await apiRequest(
        '/api/oauth/github/login?redirect=https%3A%2F%2Fevil.example.com%2F',
      )

      expect(res.status).toBe(302)
      const redirectCookie = findSetCookie(res, 'oauth_redirect_to=')
      expect(redirectCookie).toContain('oauth_redirect_to=;')
      expect(redirectCookie).toContain('Max-Age=0')
    })
  })
})
