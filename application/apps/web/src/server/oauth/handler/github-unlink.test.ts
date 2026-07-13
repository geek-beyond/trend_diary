import { vi } from 'vitest'
import type * as SupabaseInfra from '@/infrastructure/supabase'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

type UnlinkResult = Awaited<ReturnType<SupabaseInfra.SupabaseAuthClient['auth']['unlinkIdentity']>>

// unlinkIdentity の DELETE 応答を supa-emu は空の204で返すが、supabase-js は本文をJSONパースする
// ため落ちる（supa-emu 側の未対応。issue #939 で実DELETEへ置き換え予定）。この SDK 呼び出しだけを
// 差し替え、seed・ログイン・identity取得・session検証は実の supa-emu を通す
let unlinkResult: UnlinkResult | null = null

vi.mock('@/infrastructure/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof SupabaseInfra>()
  return {
    ...actual,
    createSupabaseAuthClient: (c: Parameters<typeof actual.createSupabaseAuthClient>[0]) => {
      const client = actual.createSupabaseAuthClient(c)
      const unlink = unlinkResult
      if (unlink) {
        client.auth.unlinkIdentity = () => Promise.resolve(unlink)
      }
      return client
    },
  }
})

function deleteUnlink(cookies?: string) {
  // Content-Type未指定だとcsrf()がtext/plain扱いでDELETEを403にするため、JSONを明示する
  return apiRequest('/api/oauth/github', { method: 'DELETE', cookies, contentTypeJson: true })
}

describe('GitHub連携解除', () => {
  const TEST_EMAIL = 'oauth-github-unlink-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(() => {
    unlinkResult = null
  })

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  describe('正常系', () => {
    it('他のログイン手段があれば連携を解除できる', async () => {
      const { userId, authenticationId } = await userHelper.createWithGithub(
        TEST_EMAIL,
        TEST_PASSWORD,
      )
      createdIds.userIds.push(userId)
      createdIds.authIds.push(authenticationId)
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)
      unlinkResult = { data: {}, error: null }

      const res = await deleteUnlink(cookies)

      expect(res.status).toBe(204)
    })
  })

  describe('準正常系', () => {
    it('未ログインでは認可されない', async () => {
      const res = await deleteUnlink()

      expect(res.status).toBe(401)
    })
  })
})
