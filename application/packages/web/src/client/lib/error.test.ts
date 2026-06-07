import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './error'

describe('getApiErrorMessage', () => {
  const defaultMessage = 'デフォルトメッセージ'

  const testCases: Array<{
    outline: string
    error: unknown
    expected: string
  }> = [
    {
      outline: 'Errorインスタンスのmessageを返す',
      error: new Error('API呼び出しに失敗しました'),
      expected: 'API呼び出しに失敗しました',
    },
    {
      outline: 'messageプロパティを持つオブジェクトのmessageを返す',
      error: { message: 'カスタムエラーメッセージ' },
      expected: 'カスタムエラーメッセージ',
    },
    {
      outline: 'messageプロパティの値がundefinedの場合はデフォルトメッセージを返す',
      error: { message: undefined },
      expected: defaultMessage,
    },
    {
      outline: 'messageプロパティの値がnullの場合はデフォルトメッセージを返す',
      error: { message: null },
      expected: defaultMessage,
    },
    {
      outline: 'messageプロパティを持たないオブジェクトの場合はデフォルトメッセージを返す',
      error: { code: 'UNKNOWN' },
      expected: defaultMessage,
    },
    {
      outline: 'errorが配列の場合はデフォルトメッセージを返す',
      error: [],
      expected: defaultMessage,
    },
    {
      outline: 'errorがnullの場合はデフォルトメッセージを返す',
      error: null,
      expected: defaultMessage,
    },
    {
      outline: 'errorがundefinedの場合はデフォルトメッセージを返す',
      error: undefined,
      expected: defaultMessage,
    },
    {
      outline: 'errorがプリミティブ値（文字列）の場合はデフォルトメッセージを返す',
      error: '文字列エラー',
      expected: defaultMessage,
    },
    {
      outline: 'errorがプリミティブ値（数値）の場合はデフォルトメッセージを返す',
      error: 42,
      expected: defaultMessage,
    },
  ]

  testCases.forEach(({ outline, error, expected }) => {
    it(outline, () => {
      expect(getApiErrorMessage(error, defaultMessage)).toBe(expected)
    })
  })
})
