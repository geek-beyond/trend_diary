import { describe, expect, it } from 'vitest'
import { maskQueryParams } from './mask'

describe('maskQueryParams', () => {
  describe('正常系', () => {
    it('文字列の bind 値(email等のPII)をマスクすること', () => {
      expect(maskQueryParams(['user@example.com'])).toEqual(['***'])
    })

    it('非PIIの数値・真偽値・nullは調査用に残すこと', () => {
      expect(maskQueryParams([1, 2n, true, false, null])).toEqual([1, 2n, true, false, null])
    })

    it('文字列のみをマスクし、その他の型は残すこと', () => {
      expect(maskQueryParams(['user@example.com', 123, '表示名', null])).toEqual([
        '***',
        123,
        '***',
        null,
      ])
    })
  })

  describe('準正常系（境界値）', () => {
    it('空配列を空配列のまま返すこと', () => {
      expect(maskQueryParams([])).toEqual([])
    })

    it('空文字列もマスクすること', () => {
      expect(maskQueryParams([''])).toEqual(['***'])
    })

    it('ネストされた配列内の文字列も再帰的にマスクすること', () => {
      expect(maskQueryParams([['user@example.com', 123], 'normal-string'])).toEqual([
        ['***', 123],
        '***',
      ])
    })
  })
})
