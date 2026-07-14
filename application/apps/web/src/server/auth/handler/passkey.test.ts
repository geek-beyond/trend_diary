import { apiRequest } from '@/test/helper/request'
import type { CleanUpIds } from '@/test/helper/user'
import * as userHelper from '@/test/helper/user'

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

  // oxlint-disable-next-line typescript/no-restricted-types -- 各エンドポイントへ任意形状の JSON ボディを送るため
  function post(path: string, body?: unknown, cookies?: string) {
    return apiRequest(path, {
      method: 'POST',
      cookies,
      contentTypeJson: true,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  function req(method: string, path: string, cookies?: string) {
    // Content-Type未指定だとcsrf()がtext/plain扱いでDELETEを403にするため、他のテスト同様JSONを明示する
    return apiRequest(path, { method, cookies, contentTypeJson: true })
  }

  // 認証検証には事前に登録済みpasskeyが要るため、登録 ceremony を通すヘルパ
  async function registerPasskey(cookies: string) {
    const registerStart = await post('/api/auth/passkey/register/start', undefined, cookies)
    const registerStartBody: { challengeId: string } = await registerStart.json()
    return post(
      '/api/auth/passkey/register/verify',
      { challengeId: registerStartBody.challengeId, credential: { id: CREDENTIAL_ID } },
      cookies,
    )
  }

  describe('register/start', () => {
    describe('準正常系', () => {
      it('未ログインでは401を返す', async () => {
        const res = await post('/api/auth/passkey/register/start')
        expect(res.status).toBe(401)
      })
    })
  })

  describe('register/verify', () => {
    describe('正常系', () => {
      it('登録検証に成功すると201でpasskeyのidを返す', async () => {
        const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

        const res = await registerPasskey(cookies)
        expect(res.status).toBe(201)
        const body: { id: string } = await res.json()
        expect(typeof body.id).toBe('string')
        expect(body.id.length).toBeGreaterThan(0)
      })
    })

    describe('準正常系', () => {
      it('未ログインでは401を返す', async () => {
        const res = await post('/api/auth/passkey/register/verify', {
          challengeId: 'challenge-1',
          credential: { id: CREDENTIAL_ID },
        })
        expect(res.status).toBe(401)
      })

      it('challengeId欠落では422を返す', async () => {
        const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

        const res = await post(
          '/api/auth/passkey/register/verify',
          { credential: { id: CREDENTIAL_ID } },
          cookies,
        )
        expect(res.status).toBe(422)
      })

      it('存在しないchallengeIdでは400を返す', async () => {
        const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)

        const res = await post(
          '/api/auth/passkey/register/verify',
          { challengeId: 'nonexistent-challenge', credential: { id: CREDENTIAL_ID } },
          cookies,
        )
        expect(res.status).toBe(400)
      })
    })
  })

  describe('login/verify', () => {
    describe('正常系', () => {
      it('登録済みpasskeyで認証検証に成功すると200でdisplayNameを返す', async () => {
        const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)
        await registerPasskey(cookies)

        // 認証: start(未認証で可) → verify(未認証で可) → セッション確立
        const loginStart = await post('/api/auth/passkey/login/start')
        expect(loginStart.status).toBe(200)
        const loginStartBody: { challengeId: string } = await loginStart.json()

        const res = await post('/api/auth/passkey/login/verify', {
          challengeId: loginStartBody.challengeId,
          credential: { id: CREDENTIAL_ID },
        })
        expect(res.status).toBe(200)
        const body: { displayName: string | null } = await res.json()
        expect(body).toHaveProperty('displayName')
      })
    })

    describe('準正常系', () => {
      it('未登録の資格情報では401を返す', async () => {
        const loginStart = await post('/api/auth/passkey/login/start')
        const loginStartBody: { challengeId: string } = await loginStart.json()

        const res = await post('/api/auth/passkey/login/verify', {
          challengeId: loginStartBody.challengeId,
          credential: { id: 'never-registered-credential' },
        })
        expect(res.status).toBe(401)
      })

      it('存在しないchallengeIdでは401を返す', async () => {
        const res = await post('/api/auth/passkey/login/verify', {
          challengeId: 'nonexistent-challenge',
          credential: { id: CREDENTIAL_ID },
        })
        expect(res.status).toBe(401)
      })

      it('challengeId欠落では422を返す', async () => {
        const res = await post('/api/auth/passkey/login/verify', {
          credential: { id: CREDENTIAL_ID },
        })
        expect(res.status).toBe(422)
      })
    })
  })

  describe('passkey状態の取得・無効化', () => {
    describe('正常系', () => {
      it('登録済みなら hasPasskey=true を返し、無効化すると全て削除される', async () => {
        const { cookies } = await userHelper.login(TEST_EMAIL, TEST_PASSWORD)
        await registerPasskey(cookies)

        const registered = await req('GET', '/api/auth/passkey', cookies)
        expect(registered.status).toBe(200)
        expect(await registered.json()).toEqual({ hasPasskey: true })

        const disabled = await req('DELETE', '/api/auth/passkey', cookies)
        expect(disabled.status).toBe(204)

        const afterDisable = await req('GET', '/api/auth/passkey', cookies)
        expect(await afterDisable.json()).toEqual({ hasPasskey: false })
      })
    })

    describe('準正常系', () => {
      it('未ログインで状態を取得すると401を返す', async () => {
        const res = await req('GET', '/api/auth/passkey')
        expect(res.status).toBe(401)
      })

      it('未ログインで無効化すると401を返す', async () => {
        const res = await req('DELETE', '/api/auth/passkey')
        expect(res.status).toBe(401)
      })
    })
  })
})
