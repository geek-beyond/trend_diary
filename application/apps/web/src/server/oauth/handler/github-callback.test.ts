import { vi } from 'vitest'
import type * as SupabaseInfra from '@/infrastructure/supabase'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

type ExchangeResult = Awaited<
  ReturnType<SupabaseInfra.SupabaseAuthClient['auth']['exchangeCodeForSession']>
>

// コード発行〜トークン交換は外部サービス依存で通せないため、その SDK 呼び出しだけを差し替える
let exchange: (() => Promise<ExchangeResult>) | null = null

vi.mock('@/infrastructure/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof SupabaseInfra>()
  return {
    ...actual,
    createSupabaseAuthClient: (c: Parameters<typeof actual.createSupabaseAuthClient>[0]) => {
      const client = actual.createSupabaseAuthClient(c)
      const override = exchange
      if (override) {
        client.auth.exchangeCodeForSession = override
      }
      return client
    },
  }
})

function resolveExchange(authenticationId: string): () => Promise<ExchangeResult> {
  // callbackが使うのは user.id のみ。toAuthenticationUser が要求する最小限のフィールドだけ満たす
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SDKの判別共用体を部分的な payload で満たすため
  const result = {
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
  } as ExchangeResult
  return () => Promise.resolve(result)
}

describe('GitHub OAuthコールバック', () => {
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(() => {
    exchange = null
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
      exchange = resolveExchange(authenticationId)

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
      exchange = resolveExchange('unlinked-authentication-id')

      const res = await apiRequest('/api/oauth/github/callback?code=valid-code')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/login?oauthError=github')
    })
  })

  describe('異常系', () => {
    it('コード交換が例外を投げる場合はエラー応答を返す', async () => {
      exchange = () => Promise.reject(new Error('network down'))

      const res = await apiRequest('/api/oauth/github/callback?code=broken-code')

      expect(res.status).toBe(500)
    })
  })
})
