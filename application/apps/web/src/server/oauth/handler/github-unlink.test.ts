import { ClientError } from '@trend-diary/common/errors'
import type * as UserDomain from '@trend-diary/domain/user'
import { createAuthUseCase } from '@trend-diary/domain/user'
import { err, ok } from 'neverthrow'
import { vi } from 'vitest'
import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

// 連携解除は外部の認可プロバイダに対する操作のため、その境界であるドメインの use-case
// (createAuthUseCase)の unlinkGithub だけを差し替える。authenticator も同じ use-case を使うため、
// スタブに置き換えず実装へ委譲したうえで対象メソッドのみ差し替え、認証ガードは素通しにする
vi.mock('@trend-diary/domain/user', async (importOriginal) => {
  const actual = await importOriginal<typeof UserDomain>()
  return { ...actual, createAuthUseCase: vi.fn(actual.createAuthUseCase) }
})

describe('GitHub連携解除', () => {
  const TEST_EMAIL = 'oauth-github-unlink-test@example.com'
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
    it('連携を解除できる', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const actual = await vi.importActual<typeof UserDomain>('@trend-diary/domain/user')
      vi.mocked(createAuthUseCase).mockImplementation((client, rdb) => {
        const useCase = actual.createAuthUseCase(client, rdb)
        useCase.unlinkGithub = () => Promise.resolve(ok(undefined))
        return useCase
      })

      // Content-Type未指定だとcsrf()がtext/plain扱いでDELETEを403にするため、JSONを明示する
      const res = await apiRequest('/api/oauth/github', {
        method: 'DELETE',
        cookies,
        contentTypeJson: true,
      })

      expect(res.status).toBe(204)
    })
  })

  describe('準正常系', () => {
    it('唯一のログイン手段は解除できない', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      const actual = await vi.importActual<typeof UserDomain>('@trend-diary/domain/user')
      vi.mocked(createAuthUseCase).mockImplementation((client, rdb) => {
        const useCase = actual.createAuthUseCase(client, rdb)
        useCase.unlinkGithub = () =>
          Promise.resolve(err(new ClientError('Cannot unlink the only login method', 400)))
        return useCase
      })

      const res = await apiRequest('/api/oauth/github', {
        method: 'DELETE',
        cookies,
        contentTypeJson: true,
      })

      expect(res.status).toBe(400)
    })

    it('未ログインでは認可されない', async () => {
      // Content-Type未指定だとcsrf()がtext/plain扱いでDELETEを403にするため、JSONを明示する
      const res = await apiRequest('/api/oauth/github', { method: 'DELETE', contentTypeJson: true })

      expect(res.status).toBe(401)
    })
  })
})
