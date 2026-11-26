import { describe, expect, it } from 'vitest'
import { maskQueryParams } from './mask'

describe('maskQueryParams', () => {
  it.each([
    {
      name: 'メール・表示名・空文字列をマスクし、数値・真偽値・nullを残す',
      input: ['user@example.com', '表示名', '', 123, 2n, true, false, null],
      expected: ['***', '***', '***', 123, 2n, true, false, null],
    },
    { name: '空配列を空配列のまま返す', input: [], expected: [] },
    {
      name: 'ネストされた配列内の文字列も再帰的にマスクする',
      input: [['user@example.com', 123], 'normal-string'],
      expected: [['***', 123], '***'],
    },
  ])('$name', ({ input, expected }) => {
    expect(maskQueryParams(input)).toEqual(expected)
  })
})
