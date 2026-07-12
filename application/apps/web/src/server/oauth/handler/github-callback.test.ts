import { ClientError, ServerError } from '@trend-diary/common/errors'
import type * as UserDomain from '@trend-diary/domain/user'
import { createAuthUseCase } from '@trend-diary/domain/user'
import { err, ok } from 'neverthrow'
import { vi } from 'vitest'
import { apiRequest } from '@/test/helper/request'

// GitHub本体のコード発行〜トークン交換は外部サービスのため通せない。その境界であるドメインの
// use-case(createAuthUseCase)だけを差し替え、callbackハンドラのリダイレクト振り分けを検証する。
// callbackは未認証エンドポイントのため authenticator を経由せず、use-caseは本ハンドラからのみ呼ばれる
vi.mock('@trend-diary/domain/user', async (importOriginal) => {
  const actual = await importOriginal<typeof UserDomain>()
  return { ...actual, createAuthUseCase: vi.fn(actual.createAuthUseCase) }
})

const currentUser = {
  activeUserId: 123n,
  userId: 456n,
  email: 'github-callback@example.com',
  displayName: null,
  authenticationId: 'auth-github-callback',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
}

function stubLoginWithGithubCallback(
  result: Awaited<ReturnType<ReturnType<typeof createAuthUseCase>['loginWithGithubCallback']>>,
) {
  vi.mocked(createAuthUseCase).mockReturnValueOnce(
    // oxlint-disable-next-line typescript/consistent-type-assertions -- callbackが呼ぶ loginWithGithubCallback のみを差し替えるため
    { loginWithGithubCallback: () => Promise.resolve(result) } as unknown as ReturnType<
      typeof createAuthUseCase
    >,
  )
}

describe('GitHub OAuthコールバック', () => {
  describe('正常系', () => {
    it('認証に成功すると既定の遷移先へリダイレクトする', async () => {
      stubLoginWithGithubCallback(ok(currentUser))

      const res = await apiRequest('/api/oauth/github/callback?code=valid-code')

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

    it('認証に失敗した場合はエラー種別を添えてログイン画面へ戻す', async () => {
      // コードの期限切れや連携済みユーザー不在(404)などの業務エラーはエラー画面にせず元の画面へ戻す
      stubLoginWithGithubCallback(err(new ClientError('User not found', 404)))

      const res = await apiRequest('/api/oauth/github/callback?code=expired-code')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/login?oauthError=github')
    })
  })

  describe('異常系', () => {
    it('想定外のエラーが発生した場合はエラー応答を返す', async () => {
      stubLoginWithGithubCallback(err(new ServerError(new Error('unexpected'))))

      const res = await apiRequest('/api/oauth/github/callback?code=any-code')

      expect(res.status).toBe(500)
    })
  })
})
