import type { Env } from '@/env'
import TEST_ENV from '@/test/env'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'
import app from '../../../server'

// passkeyルートはフラグでゲートされるため、有効化した環境で叩く
const PASSKEY_ENV: Env['Bindings'] = { ...TEST_ENV, PASSKEY_ENABLED: 'true' }

// supa-emuは署名検証をしないため、資格情報は id だけのダミーで登録・認証を通せる
const CREDENTIAL_ID = 'server-test-passkey-credential'

describe('passkey認証', () => {
  const TEST_EMAIL = 'passkey-test@example.com'
  const TEST_PASSWORD = 'Test@password123'
  const createdIds: CleanUpIds = { userIds: [], authIds: [] }

  beforeEach(async () => {
    const { userId, authenticationId } = await userHelper.create(TEST_EMAIL, TEST_PASSWORD)
    createdIds.userIds.push(userId)
    createdIds.authIds.push(authenticationId)
  })

  afterEach(async () => {
    await userHelper.cleanUp(createdIds)
    createdIds.userIds.length = 0
    createdIds.authIds.length = 0
  })

  function post(path: string, env: Env['Bindings'], body?: unknown, cookies?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (cookies) headers.Cookie = cookies

    return app.request(
      path,
      {
        method: 'POST',
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      env,
    )
  }

  describe('正常系', () => {
    it('passkeyを登録し、passkeyでログインしてセッションを確立できる', async () => {
      const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

      // 登録: start(要認証) → verify(要認証)
      const registerStart = await post(
        '/api/auth/passkey/register/start',
        PASSKEY_ENV,
        undefined,
        cookies,
      )
      expect(registerStart.status).toBe(200)
      const registerStartBody: { challengeId: string } = await registerStart.json()

      const registerVerify = await post(
        '/api/auth/passkey/register/verify',
        PASSKEY_ENV,
        { challengeId: registerStartBody.challengeId, credential: { id: CREDENTIAL_ID } },
        cookies,
      )
      expect(registerVerify.status).toBe(201)

      // 認証: start(未認証で可) → verify(未認証で可)
      const loginStart = await post('/api/auth/passkey/login/start', PASSKEY_ENV)
      expect(loginStart.status).toBe(200)
      const loginStartBody: { challengeId: string } = await loginStart.json()

      const loginVerify = await post('/api/auth/passkey/login/verify', PASSKEY_ENV, {
        challengeId: loginStartBody.challengeId,
        credential: { id: CREDENTIAL_ID },
      })
      expect(loginVerify.status).toBe(200)
      const body: { displayName: string | null } = await loginVerify.json()
      expect(body).toHaveProperty('displayName')
    })
  })

  describe('準正常系', () => {
    it('未登録の資格情報では認証に失敗し401を返す', async () => {
      const loginStart = await post('/api/auth/passkey/login/start', PASSKEY_ENV)
      const loginStartBody: { challengeId: string } = await loginStart.json()

      const res = await post('/api/auth/passkey/login/verify', PASSKEY_ENV, {
        challengeId: loginStartBody.challengeId,
        credential: { id: 'never-registered-credential' },
      })
      expect(res.status).toBe(401)
    })

    it('未ログインで登録を開始すると401を返す', async () => {
      const res = await post('/api/auth/passkey/register/start', PASSKEY_ENV)
      expect(res.status).toBe(401)
    })

    it('PASSKEY_ENABLEDが無効なら機能を隠すため404を返す', async () => {
      const res = await post('/api/auth/passkey/login/start', TEST_ENV)
      expect(res.status).toBe(404)
    })
  })
})
