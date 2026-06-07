import { describe, expect, it } from 'vitest'
import { newValidationError, newValidationSuccess } from './validation'

describe('newValidationSuccess', () => {
  const primitiveTestCases = [
    { name: '文字列データで成功結果を作成', data: 'test string' },
    { name: 'null値で成功結果を作成', data: null },
    { name: 'undefined値で成功結果を作成', data: undefined },
    { name: '数値データで成功結果を作成', data: 42 },
  ]

  const objectTestCases = [
    { name: 'オブジェクトデータで成功結果を作成', data: { name: 'test', age: 30 } },
    { name: '配列データで成功結果を作成', data: [1, 2, 3, 'test'] },
  ]

  primitiveTestCases.forEach((testCase) => {
    it(testCase.name, () => {
      const result = newValidationSuccess(testCase.data)

      expect(result.isValid).toBe(true)
      if (result.isValid) {
        expect(result.data).toBe(testCase.data)
      }
    })
  })

  objectTestCases.forEach((testCase) => {
    it(testCase.name, () => {
      const result = newValidationSuccess(testCase.data)

      expect(result.isValid).toBe(true)
      if (result.isValid) {
        expect(result.data).toEqual(testCase.data)
      }
    })
  })
})

describe('newValidationError', () => {
  const errorTestCases = [
    {
      name: '単一エラーでエラー結果を作成',
      errors: { field1: ['Error message'] },
    },
    {
      name: '複数フィールドエラーでエラー結果を作成',
      errors: {
        email: ['Invalid email format'],
        password: ['Password too short', 'Password must contain numbers'],
      },
    },
    {
      name: '空のエラーオブジェクトでエラー結果を作成',
      errors: {},
    },
    {
      name: '配列形式のエラーメッセージでエラー結果を作成',
      errors: {
        field1: ['Error 1', 'Error 2', 'Error 3'],
        field2: ['Single error'],
      },
    },
  ]

  errorTestCases.forEach((testCase) => {
    it(testCase.name, () => {
      const result = newValidationError(testCase.errors)

      expect(result.isValid).toBe(false)
      if (!result.isValid) {
        expect(result.errors).toEqual(testCase.errors)
      }
    })
  })
})

describe('ValidationResult型の基本動作', () => {
  it('成功結果と失敗結果を正しく判別できる', () => {
    const successResult = newValidationSuccess('data')
    const errorResult = newValidationError({ field: ['error'] })

    expect(successResult.isValid).toBe(true)
    expect(errorResult.isValid).toBe(false)

    if (successResult.isValid) {
      expect(successResult.data).toBe('data')
    }

    if (!errorResult.isValid) {
      expect(errorResult.errors).toEqual({ field: ['error'] })
    }
  })
})
