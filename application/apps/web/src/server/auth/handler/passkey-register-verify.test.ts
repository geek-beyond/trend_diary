import { HTTPException } from 'hono/http-exception'
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSupabaseAuthClient, type SupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import passkeyRegisterVerify, {
  type PasskeyRegisterVerifyInput,
  passkeyRegisterVerifyInputSchema,
} from './passkey-register-verify'

vi.mock('@/infrastructure/supabase', () => ({ createSupabaseAuthClient: vi.fn() }))

describe('passkeyRegisterVerifyInputSchema', () => {
  const registrationCredential = {
    id: 'cred-id',
    rawId: 'cred-id',
    response: { clientDataJSON: 'client-data', attestationObject: 'attestation' },
    clientExtensionResults: {},
    type: 'public-key',
  }

  describe('正常系', () => {
    it('challengeIdとcredentialオブジェクトを持つ入力を検証できる', () => {
      const result = passkeyRegisterVerifyInputSchema.safeParse({
        challengeId: 'challenge-1',
        credential: registrationCredential,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('準正常系', () => {
    const invalidTestCases = [
      {
        name: 'challengeIdが空文字の場合は検証に失敗する',
        input: { challengeId: '', credential: registrationCredential },
      },
      {
        name: 'challengeIdが欠落している場合は検証に失敗する',
        input: { credential: registrationCredential },
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
      const result = passkeyRegisterVerifyInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})

const validInput: PasskeyRegisterVerifyInput = {
  challengeId: 'challenge-1',
  credential: {
    id: 'cred-id',
    rawId: 'cred-id',
    response: { clientDataJSON: 'client-data', attestationObject: 'attestation' },
    clientExtensionResults: {},
    type: 'public-key',
  },
}

function buildContext(input: PasskeyRegisterVerifyInput = validInput) {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const json = vi.fn()
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  const c = {
    get: (key: string) => (key === CONTEXT_KEY.APP_LOG ? logger : undefined),
    req: { valid: () => input },
    json,
    env: {},
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as ZodValidatedContext<PasskeyRegisterVerifyInput>
  return { c, logger, json }
}

// Supabase Auth SDK の verifyRegistration 応答を模す
function mockVerifyRegistration(verifyRegistration: Mock) {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限のクライアントを組み立てるため
  const client = {
    auth: { passkey: { verifyRegistration } },
    // oxlint-disable-next-line typescript/no-restricted-types -- Supabase の複雑な型へ橋渡しする境界キャストのため
  } as unknown as SupabaseAuthClient
  vi.mocked(createSupabaseAuthClient).mockReturnValue(client)
}

describe('passkeyRegisterVerify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('登録検証に成功した場合は201でpasskeyのidを返す', async () => {
      mockVerifyRegistration(vi.fn().mockResolvedValue({ data: { id: 'passkey-1' }, error: null }))

      const { c, json } = buildContext()
      await passkeyRegisterVerify(c)

      expect(json).toHaveBeenCalledWith({ id: 'passkey-1' }, 201)
    })
  })

  describe('準正常系', () => {
    it('SDKが業務エラーを返した場合は400でメッセージを返す', async () => {
      mockVerifyRegistration(
        vi.fn().mockResolvedValue({ data: null, error: new Error('challenge expired') }),
      )

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await passkeyRegisterVerify(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(400)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).message).toBe(
        'Passkey registration failed: challenge expired',
      )
    })
  })

  describe('異常系', () => {
    it('SDK呼び出しが例外を投げた場合は500を返す', async () => {
      mockVerifyRegistration(vi.fn().mockRejectedValue(new Error('network down')))

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await passkeyRegisterVerify(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(500)
    })
  })
})
