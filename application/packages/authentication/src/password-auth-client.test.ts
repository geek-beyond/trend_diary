import { AuthError } from '@supabase/supabase-js'
import { AlreadyExistsError, ClientError, ServerError } from '@trend-diary/common/errors'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PasswordAuthClient } from './password-auth-client'
import type { AuthClientConfig, SupabaseAuthClient } from './supabase-client'

// バックエンド生成はクライアント内へ隠蔽されているため、生成関数をモックして auth を差し替える
vi.mock('./supabase-client', () => ({ createBackendClient: vi.fn() }))
import { createBackendClient } from './supabase-client'

const buildMock = vi.mocked(createBackendClient)

// oxlint-disable-next-line typescript/consistent-type-assertions -- 設定値は生成関数のモックにより実際には参照されないため、ダミーで足りるため
const FAKE_CONFIG = {} as AuthClientConfig
const credentials = { email: 'user@example.com', password: 'Test@password123' }

// PasswordAuthClient が触るメソッドだけを備えた auth を用意し、生成関数のモックから返す
function buildClient(auth: Record<string, ReturnType<typeof vi.fn>>): PasswordAuthClient {
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- SupabaseAuthClientは膨大な構造を持ち、テストで使う一部メソッドのみ差し込むため二重アサーションが避けられないため
  buildMock.mockReturnValue({ auth } as unknown as SupabaseAuthClient)
  return new PasswordAuthClient(FAKE_CONFIG)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('PasswordAuthClient', () => {
  describe('signIn', () => {
    describe('正常系', () => {
      it('user と session が揃うとき user を ok として返すこと', async () => {
        const user = { id: 'auth-1' }
        const client = buildClient({
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user, session: { access_token: 'token' } },
            error: null,
          }),
        })

        const result = await client.signIn(credentials)

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toEqual(user)
      })
    })

    describe('準正常系', () => {
      it('invalid_credentials は 401 の ClientError に写すこと', async () => {
        const client = buildClient({
          signInWithPassword: vi.fn().mockResolvedValue({
            data: null,
            error: new AuthError('Invalid login credentials', 400, 'invalid_credentials'),
          }),
        })

        const result = await client.signIn(credentials)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) expect(result.error.statusCode).toBe(401)
        }
      })

      it('その他の業務エラーは ServerError に写すこと', async () => {
        const client = buildClient({
          signInWithPassword: vi.fn().mockResolvedValue({
            data: null,
            error: new AuthError('rate limited', 429, 'over_request_rate_limit'),
          }),
        })

        const result = await client.signIn(credentials)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) expect(result.error).toBeInstanceOf(ServerError)
      })
    })

    describe('異常系', () => {
      it('例外は ServerError として err を返すこと', async () => {
        const client = buildClient({
          signInWithPassword: vi.fn().mockRejectedValue(new Error('network down')),
        })

        const result = await client.signIn(credentials)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('network down')
        }
      })
    })
  })

  describe('signUp', () => {
    describe('正常系', () => {
      it('成功時は user を ok として返すこと', async () => {
        const user = { id: 'auth-1', email: 'user@example.com' }
        const client = buildClient({
          signUp: vi.fn().mockResolvedValue({ data: { user, session: null }, error: null }),
        })

        const result = await client.signUp(credentials)

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toEqual(user)
      })
    })

    describe('準正常系', () => {
      it('既存ユーザーは 409 の AlreadyExistsError に写すこと', async () => {
        const client = buildClient({
          signUp: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: new AuthError('User already registered', 422, 'user_already_exists'),
          }),
        })

        const result = await client.signUp(credentials)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(AlreadyExistsError)
          if (result.error instanceof AlreadyExistsError) expect(result.error.statusCode).toBe(409)
        }
      })

      it('成功でも user が空なら ServerError に畳むこと', async () => {
        const client = buildClient({
          signUp: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: null,
          }),
        })

        const result = await client.signUp(credentials)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ServerError)
          expect(result.error.message).toBe('User registration failed')
        }
      })
    })

    describe('異常系', () => {
      it('例外は ServerError として err を返すこと', async () => {
        const client = buildClient({
          signUp: vi.fn().mockRejectedValue(new Error('network down')),
        })

        const result = await client.signUp(credentials)

        expect(result.isErr()).toBe(true)
        if (result.isErr()) expect(result.error).toBeInstanceOf(ServerError)
      })
    })
  })

  describe('signOut', () => {
    describe('正常系', () => {
      it('成功時は null を ok として返すこと', async () => {
        const client = buildClient({ signOut: vi.fn().mockResolvedValue({ error: null }) })

        const result = await client.signOut()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toBeNull()
      })
    })

    describe('異常系', () => {
      it('例外は ServerError として err を返すこと', async () => {
        const client = buildClient({
          signOut: vi.fn().mockRejectedValue(new Error('network down')),
        })

        const result = await client.signOut()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) expect(result.error).toBeInstanceOf(ServerError)
      })
    })
  })
})
