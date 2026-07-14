import { ClientError, ServerError } from '@trend-diary/common/errors'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionClient } from './session-client'
import type { AuthClientConfig, SupabaseAuthClient } from './supabase-client'

// バックエンド生成はクライアント内へ隠蔽されているため、生成関数をモックして auth を差し替える
vi.mock('./supabase-client', () => ({ createBackendClient: vi.fn() }))
import { createBackendClient } from './supabase-client'

const buildMock = vi.mocked(createBackendClient)

// oxlint-disable-next-line typescript/consistent-type-assertions -- 設定値は生成関数のモックにより実際には参照されないため、ダミーで足りるため
const FAKE_CONFIG = {} as AuthClientConfig

function buildClient(auth: Record<string, ReturnType<typeof vi.fn>>): SessionClient {
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- SupabaseAuthClientは膨大な構造を持ち、テストで使う一部メソッドのみ差し込むため二重アサーションが避けられないため
  buildMock.mockReturnValue({ auth } as unknown as SupabaseAuthClient)
  return new SessionClient(FAKE_CONFIG)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('SessionClient', () => {
  describe('getClaims', () => {
    describe('正常系', () => {
      it('claims が取れるとき authenticationId を ok として返すこと', async () => {
        const client = buildClient({
          getClaims: vi
            .fn()
            .mockResolvedValue({ data: { claims: { sub: 'auth-1' } }, error: null }),
        })

        const result = await client.getClaims()

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toEqual({ authenticationId: 'auth-1' })
      })
    })

    describe('準正常系', () => {
      it('業務エラーは 401 の ClientError(no-session)に写すこと', async () => {
        const client = buildClient({
          getClaims: vi.fn().mockResolvedValue({ data: null, error: new Error('invalid jwt') }),
        })

        const result = await client.getClaims()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error).toBeInstanceOf(ClientError)
          if (result.error instanceof ClientError) expect(result.error.statusCode).toBe(401)
        }
      })

      it('セッションが無い(data が空)ときも 401 の ClientError に畳むこと', async () => {
        const client = buildClient({
          getClaims: vi.fn().mockResolvedValue({ data: null, error: null }),
        })

        const result = await client.getClaims()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) expect(result.error).toBeInstanceOf(ClientError)
      })
    })

    describe('異常系', () => {
      it('例外は ServerError として err を返すこと', async () => {
        const client = buildClient({
          getClaims: vi.fn().mockRejectedValue(new Error('network down')),
        })

        const result = await client.getClaims()

        expect(result.isErr()).toBe(true)
        if (result.isErr()) expect(result.error).toBeInstanceOf(ServerError)
      })
    })
  })
})
