import { vi } from 'vitest'
import type * as SupabaseInfra from '@/infrastructure/supabase'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

type ExchangeResult = Awaited<
  ReturnType<SupabaseInfra.SupabaseAuthClient['auth']['exchangeCodeForSession']>
>

// コード発行〜トークン交換は外部サービス依存で通せないため、その SDK 呼び出し
// (exchangeCodeForSession)だけを差し替える。use-case・repository・DB は実のまま通す
let exchangeResult: ExchangeResult | null = null

vi.mock('@/infrastructure/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof SupabaseInfra>()
  return {
    ...actual,
    createSupabaseAuthClient: (c: Parameters<typeof actual.createSupabaseAuthClient>[0]) => {
      const client = actual.createSupabaseAuthClient(c)
      const result = exchangeResult
      if (result) {
        client.auth.exchangeCodeForSession = () => Promise.resolve(result)
      }
      return client
    },
  }
})

function buildExchangeResult(authenticationId: string): ExchangeResult {
  // callbackが使うのは user.id のみ。toAuthenticationUser が要求する最小限のフィールドだけ満たす
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SDKのUser/Session全フィールドは不要で、必要な項目のみ満たすため
  return {
    data: {
      user: {
        id: authenticationId,
        email: 'github-callback@example.com',
        email_confirmed_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      },
      session: { access_token: 'token', refresh_token: 'refresh' },
    },
    error: null,
  } as unknown as ExchangeResult
}

describe('GitHub OAuthコールバック', () => {
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(() => {
    exchangeResult = null
  })

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  describe('正常系', () => {
    it('認証に成功すると既定の遷移先へリダイレクトする', async () => {
      const email = 'oauth-github-callback-test@example.com'
      const { userId, authenticationId } = await userHelper.create(email, 'Test@password123')
      createdIds.userIds.push(userId)
      createdIds.authIds.push(authenticationId)
      exchangeResult = buildExchangeResult(authenticationId)

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

    it('連携済みユーザーが見つからなければログイン画面へ戻す', async () => {
      // 未連携のGitHubアカウントはアプリ側ユーザーが無く404となるが、再試行で解消しうるため元の画面へ戻す
      exchangeResult = buildExchangeResult('unlinked-authentication-id')

      const res = await apiRequest('/api/oauth/github/callback?code=valid-code')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/login?oauthError=github')
    })
  })

  describe('異常系', () => {
    it('コード交換のセッションが欠落している場合はエラー応答を返す', async () => {
      // oxlint-disable-next-line typescript/consistent-type-assertions -- session欠落の異常系を最小限のSDK戻り値で再現するため
      exchangeResult = {
        data: { user: null, session: null },
        error: null,
      } as unknown as ExchangeResult

      const res = await apiRequest('/api/oauth/github/callback?code=broken-code')

      expect(res.status).toBe(500)
    })
  })
})
