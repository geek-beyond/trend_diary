import type * as AuthModule from '@trend-diary/authentication'
import { Hono } from 'hono'
import { ok } from 'neverthrow'
import type { Env } from '@/env'
import { oauthProviderParamValidator } from '@/server/oauth/schema'
import oauthUnlink from './unlink'

const unlinkIdentity = vi.hoisted(() => vi.fn())

// passwordログインを前提とする結合テストでは作れない、唯一の認証手段がGitHubの状態を検証するため。
vi.mock('@trend-diary/authentication', async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModule>()),
  authClientConfig: vi.fn(() => ({})),
  OAuthClient: class {
    listIdentities = async () => ok([{ provider: 'github', identity_id: 'github-only' }])
    unlinkIdentity = unlinkIdentity
  },
}))

it('GitHubが唯一のログイン手段なら400を返し、SDKに連携解除を依頼しない', async () => {
  unlinkIdentity.mockResolvedValue(ok(undefined))
  const app = new Hono<Env>().delete('/:provider', oauthProviderParamValidator, oauthUnlink)
  const res = await app.request('/github', { method: 'DELETE' })

  expect(res.status).toBe(400)
  expect(unlinkIdentity).not.toHaveBeenCalled()
})
