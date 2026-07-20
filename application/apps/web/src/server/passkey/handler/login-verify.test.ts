import { describe, expect, it } from 'vitest'
import { passkeyLoginVerifyInputSchema } from './login-verify'

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
