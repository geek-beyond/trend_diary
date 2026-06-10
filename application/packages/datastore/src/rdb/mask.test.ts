import { describe, expect, it } from 'vitest'
import { maskQueryParams } from './mask'

describe('maskQueryParams', () => {
  it.each([
    {
      name: '文字列の bind 値(email等のPII)をマスクする',
      input: ['user@example.com'],
      expected: ['***'],
    },
    {
      name: '非PIIの数値・真偽値・nullは調査用に残す',
      input: [1, 2n, true, false, null],
      expected: [1, 2n, true, false, null],
    },
    {
      name: '文字列のみをマスクし、その他の型は残す',
      input: ['user@example.com', 123, '表示名', null],
      expected: ['***', 123, '***', null],
    },
    { name: '空配列を空配列のまま返す', input: [], expected: [] },
    { name: '空文字列もマスクする', input: [''], expected: ['***'] },
    {
      name: 'ネストされた配列内の文字列も再帰的にマスクする',
      input: [['user@example.com', 123], 'normal-string'],
      expected: [['***', 123], '***'],
    },
  ])('$name', ({ input, expected }) => {
    expect(maskQueryParams(input)).toEqual(expected)
  })
})
