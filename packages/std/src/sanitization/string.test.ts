import extractTrimmed from './string'

describe('extractTrimmed', () => {
  describe('正常系', () => {
    it('有効な文字列を正しくtrimして返すこと', () => {
      const result = extractTrimmed('  hello world  ')
      expect(result).toBe('hello world')
    })

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

    it('前後の空白のみをtrimして中央の空白は保持すること', () => {
      const result = extractTrimmed('  hello   world  ')
      expect(result).toBe('hello   world')
    })

    it('タブ文字や改行文字もtrimすること', () => {
      const result = extractTrimmed('\t\n  hello world  \n\t')
      expect(result).toBe('hello world')
    })
  })

  describe('エッジケース', () => {
    it('全角スペースも半角スペースと同様にtrimされること', () => {
      const result = extractTrimmed('　hello　')
      expect(result).toBe('hello')
    })
  })
})
