import { describe, expect, it } from 'vitest'
import { authInputSchema, passkeyVerifyInputSchema } from './auth-schema'

describe('authInputSchema', () => {
  describe('正常系', () => {
    const validTestCases = [
      {
        name: '有効な認証入力を検証できる',
        email: 'test@example.com',
        password: 'Password1!',
      },
      {
        name: '@記号を含むパスワードで検証できる',
        email: 'user@domain.com',
        password: 'Password1@',
      },
      {
        name: '$記号を含むパスワードで検証できる',
        email: 'user@domain.com',
        password: 'Password1$',
      },
      {
        name: '%記号を含むパスワードで検証できる',
        email: 'user@domain.com',
        password: 'Password1%',
      },
      {
        name: '*記号を含むパスワードで検証できる',
        email: 'user@domain.com',
        password: 'Password1*',
      },
      {
        name: '?記号を含むパスワードで検証できる',
        email: 'user@domain.com',
        password: 'Password1?',
      },
      {
        name: '&記号を含むパスワードで検証できる',
        email: 'user@domain.com',
        password: 'Password1&',
      },
      {
        name: '複数の記号を含むパスワードで検証できる',
        email: 'user@domain.com',
        password: 'Pass@word1!',
      },
      {
        name: '8文字ちょうどのパスワードで検証できる',
        email: 'user@domain.com',
        password: 'Pass1@Aa',
      },
      {
        name: '長いパスワードで検証できる',
        email: 'user@domain.com',
        password: 'VeryLongPassword123!@$',
      },
      {
        name: '72文字ちょうどのパスワードで検証できる',
        email: 'user@domain.com',
        password: `Aa1!${'a'.repeat(68)}`,
      },
    ]

    it.each(validTestCases)('$name', ({ email, password }) => {
      const result = authInputSchema.safeParse({ email, password })
      expect(result.success).toBe(true)
    })
  })

  describe('captchaToken', () => {
    it('captchaTokenを含む入力を検証できる', () => {
      const result = authInputSchema.safeParse({
        email: 'test@example.com',
        password: 'Password1!',
        captchaToken: 'captcha-token',
      })
      expect(result.success).toBe(true)
    })

    it('captchaTokenは任意項目のため省略できる', () => {
      const result = authInputSchema.safeParse({
        email: 'test@example.com',
        password: 'Password1!',
      })
      expect(result.success).toBe(true)
    })

    it('captchaTokenが文字列でない場合は検証に失敗する', () => {
      const result = authInputSchema.safeParse({
        email: 'test@example.com',
        password: 'Password1!',
        captchaToken: 123,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('異常系 - メールアドレス', () => {
    const invalidEmailTestCases = [
      {
        name: '@なしのメールアドレスでは検証に失敗する',
        email: 'invalidemail',
        password: 'Password1!',
      },
      {
        name: 'ドメインなしのメールアドレスでは検証に失敗する',
        email: 'user@',
        password: 'Password1!',
      },
      {
        name: 'ローカル部なしのメールアドレスでは検証に失敗する',
        email: '@domain.com',
        password: 'Password1!',
      },
      {
        name: '空のメールアドレスでは検証に失敗する',
        email: '',
        password: 'Password1!',
      },
    ]

    it.each(invalidEmailTestCases)('$name', ({ email, password }) => {
      const result = authInputSchema.safeParse({ email, password })
      expect(result.success).toBe(false)
    })
  })

  describe('異常系 - パスワード長', () => {
    const invalidLengthTestCases = [
      {
        name: '7文字のパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'Pass1!a',
      },
      {
        name: '空のパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: '',
      },
      {
        name: '1文字のパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'a',
      },
      {
        name: '73文字のパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: `Aa1!${'a'.repeat(69)}`,
      },
    ]

    it.each(invalidLengthTestCases)('$name', ({ email, password }) => {
      const result = authInputSchema.safeParse({ email, password })
      expect(result.success).toBe(false)
    })
  })

  describe('異常系 - パスワード形式', () => {
    const invalidFormatTestCases = [
      {
        name: '小文字を含まないパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'PASSWORD1!',
      },
      {
        name: '大文字を含まないパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'password1!',
      },
      {
        name: '数字を含まないパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'Password!',
      },
      {
        name: '記号を含まないパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'Password1',
      },
      {
        name: '許可されていない記号#を含むパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'Password1#',
      },
      {
        name: '許可されていない記号^を含むパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'Password1^',
      },
      {
        name: 'スペースを含むパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'Password 1!',
      },
      {
        name: '日本語を含むパスワードでは検証に失敗する',
        email: 'test@example.com',
        password: 'パスワード1!Aa',
      },
    ]

    it.each(invalidFormatTestCases)('$name', ({ email, password }) => {
      const result = authInputSchema.safeParse({ email, password })
      expect(result.success).toBe(false)
    })
  })
})

describe('passkeyVerifyInputSchema', () => {
  const registrationCredential = {
    id: 'cred-id',
    rawId: 'cred-id',
    response: { clientDataJSON: 'client-data', attestationObject: 'attestation' },
    clientExtensionResults: {},
    type: 'public-key',
  }

  describe('正常系', () => {
    it('challengeIdとcredentialオブジェクトを持つ入力を検証できる', () => {
      const result = passkeyVerifyInputSchema.safeParse({
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
      const result = passkeyVerifyInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})
