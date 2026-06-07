import { describe, expect, it } from 'vitest'
import { authInputSchema } from './auth-schema'

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
    ]

    it.each(validTestCases)('$name', ({ email, password }) => {
      const result = authInputSchema.safeParse({ email, password })
      expect(result.success).toBe(true)
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
