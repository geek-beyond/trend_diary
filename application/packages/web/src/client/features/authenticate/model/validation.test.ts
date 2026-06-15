import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { type AuthenticateErrors, validateAuthenticateForm } from './validation'

describe('validateAuthenticateForm', () => {
  describe('成功ケース', () => {
    it('有効なemail/passwordで成功する', () => {
      const formData = new FormData()
      formData.append('email', 'test@example.com')
      formData.append('password', 'Test@123')

      const result = validateAuthenticateForm(formData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.password).toBe('Test@123')
      }
    })
  })

  describe('emailバリデーション失敗', () => {
    const emailFailureCases = [
      {
        name: '@マークがないemailで失敗する',
        email: 'invalidemail.com',
      },
      {
        name: 'ドメイン部分がないemailで失敗する',
        email: 'user@',
      },
      {
        name: 'ローカル部分がないemailで失敗する',
        email: '@example.com',
      },
      {
        name: '空文字列のemailで失敗する',
        email: '',
      },
    ]

    emailFailureCases.forEach((testCase) => {
      it(testCase.name, () => {
        const formData = new FormData()
        formData.append('email', testCase.email)
        formData.append('password', 'validpassword')

        const result = validateAuthenticateForm(formData)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(z.flattenError(result.error).fieldErrors.email).toBeDefined()
        }
      })
    })
  })

  describe('passwordバリデーション境界値テスト', () => {
    const passwordBoundaryCases = [
      {
        name: '最小長パスワード(8文字)で成功する',
        password: 'Test@123',
        expectedValid: true,
      },
      {
        name: '7文字以下のパスワードで失敗する',
        password: '1234567',
        expectedValid: false,
      },
      {
        name: '最大長パスワード(50文字)で成功する',
        password: `Test@123${'a'.repeat(42)}`,
        expectedValid: true,
      },
      {
        name: '51文字以上のパスワードで失敗する',
        password: 'a'.repeat(51),
        expectedValid: false,
      },
      {
        name: '空文字列のパスワードで失敗する',
        password: '',
        expectedValid: false,
      },
    ]

    passwordBoundaryCases.forEach((testCase) => {
      it(testCase.name, () => {
        const formData = new FormData()
        formData.append('email', 'test@example.com')
        formData.append('password', testCase.password)

        const result = validateAuthenticateForm(formData)

        expect(result.success).toBe(testCase.expectedValid)
        if (!testCase.expectedValid && !result.success) {
          expect(z.flattenError(result.error).fieldErrors.password).toBeDefined()
        }
      })
    })
  })

  describe('複数フィールドエラー', () => {
    it('両方のフィールドが無効な場合、両方のエラーを返す', () => {
      const formData = new FormData()
      formData.append('email', 'invalid-email')
      formData.append('password', '123')

      const result = validateAuthenticateForm(formData)

      expect(result.success).toBe(false)
      if (!result.success) {
        const { fieldErrors } = z.flattenError(result.error)
        expect(fieldErrors.email).toBeDefined()
        expect(fieldErrors.password).toBeDefined()
      }
    })
  })

  describe('FormDataの異常ケース', () => {
    const formDataAnomalyCases: Array<{
      name: string
      setupFormData: (formData: FormData) => void
      expectedErrors: Array<keyof AuthenticateErrors>
    }> = [
      {
        name: 'emailキーが存在しない場合',
        setupFormData: (formData: FormData) => {
          formData.append('password', 'validpassword')
        },
        expectedErrors: ['email'],
      },
      {
        name: 'passwordキーが存在しない場合',
        setupFormData: (formData: FormData) => {
          formData.append('email', 'test@example.com')
        },
        expectedErrors: ['password'],
      },
      {
        name: '空のFormDataの場合',
        setupFormData: () => {
          // 何も追加しない
        },
        expectedErrors: ['email', 'password'],
      },
    ]

    formDataAnomalyCases.forEach((testCase) => {
      it(testCase.name, () => {
        const formData = new FormData()
        testCase.setupFormData(formData)

        const result = validateAuthenticateForm(formData)

        expect(result.success).toBe(false)
        if (!result.success) {
          const { fieldErrors } = z.flattenError(result.error)
          testCase.expectedErrors.forEach((errorField) => {
            expect(fieldErrors[errorField]).toBeDefined()
          })
        }
      })
    })
  })
})
