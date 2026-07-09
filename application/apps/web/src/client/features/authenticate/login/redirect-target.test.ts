import { describe, expect, it } from 'vitest'
import { resolveLoginRedirectTarget } from './redirect-target'

describe('resolveLoginRedirectTarget', () => {
  describe('正常系', () => {
    it.each([
      { outline: '単純なパス', input: '/diary', expected: '/diary' },
      { outline: 'クエリパラメータ付きのパス', input: '/diary?page=2', expected: '/diary?page=2' },
    ])('$outlineはそのまま返す', ({ input, expected }) => {
      expect(resolveLoginRedirectTarget(input)).toBe(expected)
    })
  })

  describe('準正常系', () => {
    it.each([
      { outline: 'null', input: null },
      { outline: '空文字', input: '' },
      { outline: 'スキーム付きの外部URL', input: 'https://evil.example.com' },
      { outline: 'プロトコル相対URL', input: '//evil.example.com' },
      { outline: 'バックスラッシュ始まりのURL', input: '/\\evil.example.com' },
      { outline: 'スラッシュから始まらない相対パス', input: 'diary' },
    ])('$outlineはundefinedを返す', ({ input }) => {
      expect(resolveLoginRedirectTarget(input)).toBeUndefined()
    })
  })
})
