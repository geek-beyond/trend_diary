import type * as UserDomain from '@trend-diary/domain/user'
import { createAuthUseCase } from '@trend-diary/domain/user'
import { ok } from 'neverthrow'
import { vi } from 'vitest'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

// GitHub連携の有無を持つのは外部の認可プロバイダのため、その境界であるドメインの use-case
// (createAuthUseCase)の hasLinkedGithub だけを差し替える。authenticator も同じ use-case を使うため、
// スタブに置き換えず実装へ委譲したうえで対象メソッドのみ差し替え、認証ガードは素通しにする
vi.mock('@trend-diary/domain/user', async (importOriginal) => {
  const actual = await importOriginal<typeof UserDomain>()
  return { ...actual, createAuthUseCase: vi.fn(actual.createAuthUseCase) }
})

describe('GitHub連携状態の取得', () => {
  const TEST_EMAIL = 'oauth-github-status-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    const actual = await vi.importActual<typeof UserDomain>('@trend-diary/domain/user')
    vi.mocked(createAuthUseCase).mockImplementation(actual.createAuthUseCase)

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
      { name: '連携済みなら連携ありとして返す', linked: true },
      { name: '未連携なら連携なしとして返す', linked: false },
    ])('$name', async ({ linked }) => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const actual = await vi.importActual<typeof UserDomain>('@trend-diary/domain/user')
      vi.mocked(createAuthUseCase).mockImplementation((client, rdb) => {
        const useCase = actual.createAuthUseCase(client, rdb)
        useCase.hasLinkedGithub = () => Promise.resolve(ok(linked))
        return useCase
      })

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
