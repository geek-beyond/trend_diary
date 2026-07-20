import { resolveLoginRedirectTarget } from './redirect-target'

describe('resolveLoginRedirectTarget', () => {
  describe('正常系', () => {
    it.each([
      { outline: '単純なパス', input: '/diary', expected: '/diary' },
      { outline: 'クエリパラメータ付きのパス', input: '/diary?page=2', expected: '/diary?page=2' },
      {
        outline: 'ハッシュ付きのパス',
        input: '/settings#security',
        expected: '/settings#security',
      },
    ])('$outlineはそのまま返す', ({ input, expected }) => {
      expect(resolveLoginRedirectTarget(input)).toBe(expected)
    })
  })

  describe('準正常系', () => {
    it.each([
      { outline: 'undefined', input: undefined },
      { outline: 'null', input: null },
      { outline: '空文字', input: '' },
      { outline: 'スキーム付きの外部URL', input: 'https://evil.example.com' },
      { outline: 'プロトコル相対URL', input: '//evil.example.com' },
      { outline: 'バックスラッシュ始まりのURL', input: '/\\evil.example.com' },
      { outline: 'スラッシュから始まらない相対パス', input: 'diary' },
      { outline: 'タブを挟んだプロトコル相対URL', input: '/\t//evil.example.com' },
      { outline: '改行を挟んだプロトコル相対URL', input: '/\n//evil.example.com' },
      { outline: 'ログイン画面自身', input: '/sessions' },
      { outline: 'クエリ付きのログイン画面自身', input: '/sessions?foo=bar' },
      { outline: '新規登録画面', input: '/registrations' },
    ])('$outlineはundefinedを返す', ({ input }) => {
      expect(resolveLoginRedirectTarget(input)).toBeUndefined()
    })
  })
})
