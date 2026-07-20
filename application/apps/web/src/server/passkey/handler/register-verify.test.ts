import { describe, expect, it } from 'vitest'
import { passkeyRegisterVerifyInputSchema } from './register-verify'

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
