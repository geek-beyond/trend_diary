import { toMediaType } from './media-icon'

describe('toMediaType', () => {
  describe('正常系', () => {
    it.each([['qiita'], ['zenn'], ['hatena']])('%s はそのまま返すこと', (media) => {
      expect(toMediaType(media)).toBe(media)
    })
  })

  describe('異常系', () => {
    // 未知の media は DB データ破損＝契約違反のため、別媒体のアイコンに化けさせず送出する
    it('未知の media は契約違反として送出すること', () => {
      expect(() => toMediaType('unknown-media')).toThrow('has unknown media')
    })
  })
})
