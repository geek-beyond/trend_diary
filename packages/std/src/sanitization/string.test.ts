import extractTrimmed from './string'

describe('extractTrimmed', () => {
  describe('正常系', () => {
    it('trimが不要な文字列をそのまま返すこと', () => {
      const result = extractTrimmed('hello world')
      expect(result).toBe('hello world')
    })

    it('空白のみの文字列に対してundefinedを返すこと', () => {
      const result = extractTrimmed('   ')
      expect(result).toBeUndefined()
    })

    it('空文字列に対してundefinedを返すこと', () => {
      const result = extractTrimmed('')
      expect(result).toBeUndefined()
    })

    it('undefinedが渡された場合undefinedを返すこと', () => {
      const result = extractTrimmed(undefined)
      expect(result).toBeUndefined()
    })

    it('前後の半角・全角・タブ・改行をtrimし、中央の空白を保持すること', () => {
      const result = extractTrimmed('\t　 hello   world 　\n')
      expect(result).toBe('hello   world')
    })
  })
})
