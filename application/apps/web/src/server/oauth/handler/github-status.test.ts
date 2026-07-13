import { vi } from 'vitest'
import type * as SupabaseInfra from '@/infrastructure/supabase'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

type IdentitiesResult = Awaited<
  ReturnType<SupabaseInfra.SupabaseAuthClient['auth']['getUserIdentities']>
>

// 連携の有無は外部プロバイダ依存で通せないため、その SDK 呼び出し(getUserIdentities)だけを
// 差し替える。session検証は触らないため authenticator は実のまま通る
let identitiesResult: IdentitiesResult | null = null

vi.mock('@/infrastructure/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof SupabaseInfra>()
  return {
    ...actual,
    createSupabaseAuthClient: (c: Parameters<typeof actual.createSupabaseAuthClient>[0]) => {
      const client = actual.createSupabaseAuthClient(c)
      const identities = identitiesResult
      if (identities) {
        client.auth.getUserIdentities = () => Promise.resolve(identities)
      }
      return client
    },
  }
})

function buildIdentities(providers: string[]): IdentitiesResult {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SDKのUserIdentity全フィールドは不要でproviderのみ満たすため
  return {
    data: { identities: providers.map((provider) => ({ provider })) },
    error: null,
  } as unknown as IdentitiesResult
}

describe('GitHub連携状態の取得', () => {
  const TEST_EMAIL = 'oauth-github-status-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    identitiesResult = null
    const { userId, authenticationId } = await userHelper.create(TEST_EMAIL, TEST_PASSWORD)
    createdIds.userIds.push(userId)
    createdIds.authIds.push(authenticationId)
  })

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  describe('正常系', () => {
    it.each([
      { name: '連携済みなら連携ありとして返す', providers: ['email', 'github'], linked: true },
      { name: '未連携なら連携なしとして返す', providers: ['email'], linked: false },
    ])('$name', async ({ providers, linked }) => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)
      identitiesResult = buildIdentities(providers)

      const res = await apiRequest('/api/oauth/github', { cookies })

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ linked })
    })
  })

  describe('準正常系', () => {
    it('未ログインでは認可されない', async () => {
      const res = await apiRequest('/api/oauth/github')

      expect(res.status).toBe(401)
    })
  })
})
