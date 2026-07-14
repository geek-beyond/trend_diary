import { ClientError, ServerError } from '@trend-diary/common/errors'
import { createAccountUseCase } from '@trend-diary/domain/user'
import { HTTPException } from 'hono/http-exception'
import { err, ok } from 'neverthrow'
import type { Mock } from 'vitest'
import { describe, expect, it, vi } from 'vitest'
import { createSupabaseAuthClient, type SupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import passkeyLoginVerify, {
  type PasskeyLoginVerifyInput,
  passkeyLoginVerifyInputSchema,
} from './passkey-login-verify'

vi.mock('@/infrastructure/supabase', () => ({ createSupabaseAuthClient: vi.fn() }))
vi.mock('@trend-diary/datastore/rdb', () => ({ default: vi.fn(() => ({})) }))
vi.mock('@trend-diary/domain/user', () => ({ createAccountUseCase: vi.fn() }))

describe('passkeyLoginVerifyInputSchema', () => {
  const authenticationCredential = {
    id: 'cred-id',
    rawId: 'cred-id',
    response: { clientDataJSON: 'client-data', authenticatorData: 'auth-data', signature: 'sig' },
    clientExtensionResults: {},
    type: 'public-key',
  }

  describe('正常系', () => {
    it('challengeIdとcredentialオブジェクトを持つ入力を検証できる', () => {
      const result = passkeyLoginVerifyInputSchema.safeParse({
        challengeId: 'challenge-1',
        credential: authenticationCredential,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('準正常系', () => {
    const invalidTestCases = [
      {
        name: 'challengeIdが空文字の場合は検証に失敗する',
        input: { challengeId: '', credential: authenticationCredential },
      },
      {
        name: 'challengeIdが欠落している場合は検証に失敗する',
        input: { credential: authenticationCredential },
      },
      {
        name: 'credentialがオブジェクトでない場合は検証に失敗する',
        input: { challengeId: 'challenge-1', credential: 'not-an-object' },
      },
      {
        name: 'credentialが配列の場合は検証に失敗する',
        input: { challengeId: 'challenge-1', credential: [] },
      },
      {
        name: 'credentialがnullの場合は検証に失敗する',
        input: { challengeId: 'challenge-1', credential: null },
      },
      {
        name: 'credentialが欠落している場合は検証に失敗する',
        input: { challengeId: 'challenge-1' },
      },
    ]

    it.each(invalidTestCases)('$name', ({ input }) => {
      const result = passkeyLoginVerifyInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})

const validInput: PasskeyLoginVerifyInput = {
  challengeId: 'challenge-1',
  credential: {
    id: 'cred-id',
    rawId: 'cred-id',
    response: { clientDataJSON: 'client-data', authenticatorData: 'auth-data', signature: 'sig' },
    clientExtensionResults: {},
    type: 'public-key',
  },
}

// verifyAuthentication が成功時に返す user / session を模す
const verifiedUser = { user: { id: 'auth-uuid' }, session: { access_token: 'token' } }

function buildContext(input: PasskeyLoginVerifyInput = validInput) {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const json = vi.fn()
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  const c = {
    get: (key: string) => (key === CONTEXT_KEY.APP_LOG ? logger : undefined),
    req: { valid: () => input },
    json,
    env: { DB: {} },
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as ZodValidatedContext<PasskeyLoginVerifyInput>
  return { c, logger, json }
}

// Supabase Auth SDK の verifyAuthentication 応答を模す
function mockVerifyAuthentication(verifyAuthentication: Mock) {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限のクライアントを組み立てるため
  const client = {
    auth: { passkey: { verifyAuthentication } },
    // oxlint-disable-next-line typescript/no-restricted-types -- Supabase の複雑な型へ橋渡しする境界キャストのため
  } as unknown as SupabaseAuthClient
  vi.mocked(createSupabaseAuthClient).mockReturnValue(client)
}

// resolveActiveUser の結果を差し替える
function mockResolveActiveUser(resolveActiveUser: Mock) {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限のユースケースを組み立てるため
  const useCase = {
    resolveActiveUser,
    // oxlint-disable-next-line typescript/no-restricted-types -- ユースケースの複雑な型へ橋渡しする境界キャストのため
  } as unknown as ReturnType<typeof createAccountUseCase>
  vi.mocked(createAccountUseCase).mockReturnValue(useCase)
}

describe('passkeyLoginVerify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('認証検証とアカウント解決に成功した場合は200でdisplayNameを返す', async () => {
      mockVerifyAuthentication(vi.fn().mockResolvedValue({ data: verifiedUser, error: null }))
      mockResolveActiveUser(
        vi.fn().mockResolvedValue(ok({ activeUserId: 1n, displayName: 'テスト太郎' })),
      )

      const { c, json } = buildContext()
      await passkeyLoginVerify(c)

      expect(json).toHaveBeenCalledWith({ displayName: 'テスト太郎' }, 200)
    })

    it('displayNameがnullでも200で返す', async () => {
      mockVerifyAuthentication(vi.fn().mockResolvedValue({ data: verifiedUser, error: null }))
      mockResolveActiveUser(vi.fn().mockResolvedValue(ok({ activeUserId: 1n, displayName: null })))

      const { c, json } = buildContext()
      await passkeyLoginVerify(c)

      expect(json).toHaveBeenCalledWith({ displayName: null }, 200)
    })
  })

  describe('準正常系', () => {
    it('SDKが業務エラーを返した場合は401を返す', async () => {
      mockVerifyAuthentication(
        vi.fn().mockResolvedValue({ data: null, error: new Error('invalid credential') }),
      )

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await passkeyLoginVerify(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(401)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).message).toBe('Invalid passkey')
    })

    it('アカウント解決でユーザーが見つからない場合は404を返す', async () => {
      mockVerifyAuthentication(vi.fn().mockResolvedValue({ data: verifiedUser, error: null }))
      mockResolveActiveUser(vi.fn().mockResolvedValue(err(new ClientError('User not found', 404))))

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await passkeyLoginVerify(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(404)
    })
  })

  describe('異常系', () => {
    it('検証成功でもuser/sessionが空の場合は500を返す', async () => {
      mockVerifyAuthentication(
        vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      )

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await passkeyLoginVerify(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(500)
    })

    it('SDK呼び出しが例外を投げた場合は500を返す', async () => {
      mockVerifyAuthentication(vi.fn().mockRejectedValue(new Error('network down')))

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await passkeyLoginVerify(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(500)
    })

    it('アカウント解決でServerErrorが発生した場合は500を返す', async () => {
      mockVerifyAuthentication(vi.fn().mockResolvedValue({ data: verifiedUser, error: null }))
      mockResolveActiveUser(
        vi.fn().mockResolvedValue(err(new ServerError(new Error('db failure')))),
      )

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await passkeyLoginVerify(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(500)
    })
  })
})
