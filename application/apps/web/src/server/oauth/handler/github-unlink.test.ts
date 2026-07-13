import { vi } from 'vitest'
import type * as SupabaseInfra from '@/infrastructure/supabase'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

type Auth = SupabaseInfra.SupabaseAuthClient['auth']
type IdentitiesResult = Awaited<ReturnType<Auth['getUserIdentities']>>
type UnlinkResult = Awaited<ReturnType<Auth['unlinkIdentity']>>

// 連携解除の identity 取得・解除は外部プロバイダ依存で通せないため、その SDK 呼び出し
// (getUserIdentities / unlinkIdentity)だけを差し替える。session検証は触らず authenticator は実で通す
let identitiesResult: IdentitiesResult | null = null
let unlinkResult: UnlinkResult | null = null

vi.mock('@/infrastructure/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof SupabaseInfra>()
  return {
    ...actual,
    createSupabaseAuthClient: (c: Parameters<typeof actual.createSupabaseAuthClient>[0]) => {
      const client = actual.createSupabaseAuthClient(c)
      const identities = identitiesResult
      const unlink = unlinkResult
      if (identities) {
        client.auth.getUserIdentities = () => Promise.resolve(identities)
      }
      if (unlink) {
        client.auth.unlinkIdentity = () => Promise.resolve(unlink)
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
  } as IdentitiesResult
}

function deleteUnlink(cookies: string) {
  // Content-Type未指定だとcsrf()がtext/plain扱いでDELETEを403にするため、JSONを明示する
  return apiRequest('/api/oauth/github', { method: 'DELETE', cookies, contentTypeJson: true })
}

describe('GitHub連携解除', () => {
  const TEST_EMAIL = 'oauth-github-unlink-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    identitiesResult = null
    unlinkResult = null
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
    it('他のログイン手段があれば連携を解除できる', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)
      identitiesResult = buildIdentities(['email', 'github'])
      unlinkResult = { data: {}, error: null }

      const res = await deleteUnlink(cookies)

      expect(res.status).toBe(204)
    })
  })

  describe('準正常系', () => {
    it('唯一のログイン手段は解除できない', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)
      identitiesResult = buildIdentities(['github'])

      const res = await deleteUnlink(cookies)

      expect(res.status).toBe(400)
    })

    it('未ログインでは認可されない', async () => {
      // Content-Type未指定だとcsrf()がtext/plain扱いでDELETEを403にするため、JSONを明示する
      const res = await apiRequest('/api/oauth/github', { method: 'DELETE', contentTypeJson: true })

      expect(res.status).toBe(401)
    })
  })
})
