import { describe, expect, it } from 'vitest'
import { ARTICLE_MEDIA, ARTICLE_MEDIA_LABELS, isArticleMedia } from './media'

describe('media', () => {
  describe('ARTICLE_MEDIA', () => {
    it('全てのサポート対象メディアを含むこと', () => {
      expect(ARTICLE_MEDIA).toEqual(['qiita', 'zenn', 'hatena'])
    })
  })

  describe('ARTICLE_MEDIA_LABELS', () => {
    it('各メディアに対応する表示用ラベルを保持すること', () => {
      expect(ARTICLE_MEDIA_LABELS.qiita).toBe('Qiita')
      expect(ARTICLE_MEDIA_LABELS.zenn).toBe('Zenn')
      expect(ARTICLE_MEDIA_LABELS.hatena).toBe('はてブ')
    })

    it('全てのARTICLE_MEDIA要素に対応するラベルが定義されていること', () => {
      for (const media of ARTICLE_MEDIA) {
        expect(ARTICLE_MEDIA_LABELS[media]).toBeDefined()
        expect(typeof ARTICLE_MEDIA_LABELS[media]).toBe('string')
      }
    })
  })

  describe('isArticleMedia', () => {
    describe('正常系', () => {
      it.each(['qiita', 'zenn', 'hatena'])(
        'サポート対象のメディア(%s)に対してtrueを返すこと',
        (media) => {
          expect(isArticleMedia(media)).toBe(true)
        },
      )
    })

    describe('異常系', () => {
      it.each(['note', 'medium', 'invalid', 'Qiita', 'ZENN', '', ' qiita', 'qiita '])(
        'サポート対象外の文字列(%s)に対してfalseを返すこと',
        (value) => {
          expect(isArticleMedia(value)).toBe(false)
        },
      )
    })
  })
})
