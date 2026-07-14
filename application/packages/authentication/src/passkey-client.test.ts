import { AuthError } from '@supabase/supabase-js'
import { ClientError, ServerError } from '@trend-diary/common/errors'
import { describe, expect, it, vi } from 'vitest'
import { PasskeyClient } from './passkey-client'
import type { SupabaseAuthClient } from './supabase-client'

// PasskeyClient が触る passkey メソッドだけを備えたモッククライアントを組み立てる
function createClientMock(passkey: Record<string, ReturnType<typeof vi.fn>>): SupabaseAuthClient {
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- SupabaseAuthClientは膨大な構造を持ち、テストで使う一部メソッドのみ差し込むため二重アサーションが避けられないため
  return { auth: { passkey } } as unknown as SupabaseAuthClient
}

// credential はモック済みメソッドへ素通しされるだけなので、SDKの厳密な型は満たさなくてよい
// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- SDKのcredential型は複雑だがモックでは値を使わないため二重アサーションで空値を渡すため
const verifyParams = { challengeId: 'challenge-1', credential: {} as unknown as never }

describe('PasskeyClient', () => {
  describe('startRegistration', () => {
    describe('正常系', () => {
      it('成功時は data を ok として返すこと', async () => {
        const data = { challenge_id: 'c1', options: {} }
        const client = new PasskeyClient(
          createClientMock({ startRegistration: vi.fn().mockResolvedValue({ data, error: null }) }),
        )

        const result = await client.startRegistration()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toEqual(data)
      })
    })

    describe('準正常系', () => {
      it('業務エラーは文脈付きの ServerError に写すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({
            startRegistration: vi.fn().mockResolvedValue({
              data: null,
              error: new AuthError('boom', 500, 'unexpected_failure'),
            }),
          }),
        )

        const result = await client.startRegistration()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('Passkey registration start failed: boom')
        }
      })
    })

    describe('異常系', () => {
      it('例外は ServerError として err を返すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({
            startRegistration: vi.fn().mockRejectedValue(new Error('network down')),
          }),
        )

        const result = await client.startRegistration()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) expect(result.error).toBeInstanceOf(ServerError)
      })
    })
  })

  describe('startAuthentication', () => {
    describe('正常系', () => {
      it('成功時は data を ok として返すこと', async () => {
        const data = { challenge_id: 'c1', options: {} }
        const client = new PasskeyClient(
          createClientMock({
            startAuthentication: vi.fn().mockResolvedValue({ data, error: null }),
          }),
        )

        const result = await client.startAuthentication()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toEqual(data)
      })
    })

    describe('準正常系', () => {
      it('業務エラーは文脈付きの ServerError に写すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({
            startAuthentication: vi.fn().mockResolvedValue({
              data: null,
              error: new AuthError('boom', 500, 'unexpected_failure'),
            }),
          }),
        )

        const result = await client.startAuthentication()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('Passkey authentication start failed: boom')
        }
      })
    })
  })

  describe('verifyRegistration', () => {
    describe('正常系', () => {
      it('成功時は登録結果を ok として返すこと', async () => {
        const data = { id: 'passkey-1' }
        const client = new PasskeyClient(
          createClientMock({
            verifyRegistration: vi.fn().mockResolvedValue({ data, error: null }),
          }),
        )

        const result = await client.verifyRegistration(verifyParams)

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toEqual(data)
      })
    })

    describe('準正常系', () => {
      it('業務エラーは 400 の ClientError に写すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({
            verifyRegistration: vi.fn().mockResolvedValue({
              data: null,
              error: new AuthError('invalid credential', 400, 'validation_failed'),
            }),
          }),
        )

        const result = await client.verifyRegistration(verifyParams)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) expect(result.error.statusCode).toBe(400)
        }
      })
    })
  })

  describe('verifyAuthentication', () => {
    describe('正常系', () => {
      it('user と session が揃うとき user を ok として返すこと', async () => {
        const user = { id: 'auth-1' }
        const client = new PasskeyClient(
          createClientMock({
            verifyAuthentication: vi.fn().mockResolvedValue({
              data: { user, session: { access_token: 'token' } },
              error: null,
            }),
          }),
        )

        const result = await client.verifyAuthentication(verifyParams)

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toEqual(user)
      })
    })

    describe('準正常系', () => {
      it('業務エラーは 401 の ClientError に写すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({
            verifyAuthentication: vi.fn().mockResolvedValue({
              data: null,
              error: new AuthError('invalid passkey', 401, 'invalid_credentials'),
            }),
          }),
        )

        const result = await client.verifyAuthentication(verifyParams)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) expect(result.error.statusCode).toBe(401)
        }
      })

      it('成功でも session が空なら ServerError に畳むこと', async () => {
        const client = new PasskeyClient(
          createClientMock({
            verifyAuthentication: vi.fn().mockResolvedValue({
              data: { user: { id: 'auth-1' }, session: null },
              error: null,
            }),
          }),
        )

        const result = await client.verifyAuthentication(verifyParams)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('Passkey authentication failed')
        }
      })
    })

    describe('異常系', () => {
      it('例外は ServerError として err を返すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({
            verifyAuthentication: vi.fn().mockRejectedValue(new Error('network down')),
          }),
        )

        const result = await client.verifyAuthentication(verifyParams)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) expect(result.error).toBeInstanceOf(ServerError)
      })
    })
  })

  describe('list', () => {
    describe('正常系', () => {
      it('成功時は passkey 配列を ok として返すこと', async () => {
        const data = [{ id: 'passkey-1' }]
        const client = new PasskeyClient(
          createClientMock({ list: vi.fn().mockResolvedValue({ data, error: null }) }),
        )

        const result = await client.list()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toEqual(data)
      })
    })

    describe('準正常系', () => {
      it('業務エラーは文脈付きの ServerError に写すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({
            list: vi.fn().mockResolvedValue({
              data: null,
              error: new AuthError('boom', 500, 'unexpected_failure'),
            }),
          }),
        )

        const result = await client.list()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('Passkey list failed: boom')
        }
      })
    })

    describe('異常系', () => {
      it('例外は ServerError として err を返すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({ list: vi.fn().mockRejectedValue(new Error('network down')) }),
        )

        const result = await client.list()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) expect(result.error).toBeInstanceOf(ServerError)
      })
    })
  })

  describe('delete', () => {
    describe('正常系', () => {
      it('成功時は null を ok として返すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({ delete: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        )

        const result = await client.delete({ passkeyId: 'passkey-1' })

        expect(result.isOk()).toBe(true)
      })
    })

    describe('準正常系', () => {
      it('業務エラーは ServerError に写すこと', async () => {
        const client = new PasskeyClient(
          createClientMock({
            delete: vi.fn().mockResolvedValue({
              data: null,
              error: new AuthError('not found', 404, 'not_found'),
            }),
          }),
        )

        const result = await client.delete({ passkeyId: 'passkey-1' })

        expect(result.isErr()).toBe(true)
        if (result.isErr()) expect(result.error).toBeInstanceOf(ServerError)
      })
    })
  })
})
