import { describe, expect, it } from 'vitest'
import { diaryReadItemSchema, diarySourceSchema, diarySummarySchema } from './diary-schema'

describe('diarySummarySchema', () => {
  describe('正常系', () => {
    const validTestCases = [
      { name: '読了数とスキップ数が0の場合に検証成功すること', data: { read: 0, skip: 0 } },
      { name: '正の整数値を受け入れること', data: { read: 10, skip: 5 } },
    ]

    it.each(validTestCases)('$name', ({ data }) => {
      const result = diarySummarySchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('異常系', () => {
    const invalidTestCases = [
      { name: 'readが負の整数の場合に検証失敗すること', data: { read: -1, skip: 0 } },
      { name: 'skipが負の整数の場合に検証失敗すること', data: { read: 0, skip: -1 } },
      { name: 'readが小数の場合に検証失敗すること', data: { read: 1.5, skip: 0 } },
      { name: 'readが文字列の場合に検証失敗すること', data: { read: '1', skip: 0 } },
      { name: 'readフィールドが欠けている場合に検証失敗すること', data: { skip: 0 } },
      { name: 'skipフィールドが欠けている場合に検証失敗すること', data: { read: 0 } },
    ]

    it.each(invalidTestCases)('$name', ({ data }) => {
      const result = diarySummarySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe('diarySourceSchema', () => {
  describe('正常系', () => {
    it.each(['qiita', 'zenn', 'hatena'])('media=%s で有効な集計データを受け入れること', (media) => {
      const result = diarySourceSchema.safeParse({ media, read: 1, skip: 1 })
      expect(result.success).toBe(true)
    })
  })

  describe('異常系', () => {
    const invalidTestCases = [
      {
        name: 'mediaが許可リストにない場合に検証失敗すること',
        data: { media: 'note', read: 1, skip: 1 },
      },
      {
        name: 'readが負の整数の場合に検証失敗すること',
        data: { media: 'qiita', read: -1, skip: 0 },
      },
      {
        name: 'skipが負の整数の場合に検証失敗すること',
        data: { media: 'qiita', read: 0, skip: -1 },
      },
    ]

    it.each(invalidTestCases)('$name', ({ data }) => {
      const result = diarySourceSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe('diaryReadItemSchema', () => {
  const validReadItem = {
    readHistoryId: 1n,
    articleId: 10n,
    media: 'qiita' as const,
    title: 'Sample title',
    url: 'https://example.com/sample',
    readAt: new Date('2026-03-07T08:00:00.000Z'),
  }

  describe('正常系', () => {
    it('有効な読了履歴アイテムを受け入れること', () => {
      const result = diaryReadItemSchema.safeParse(validReadItem)
      expect(result.success).toBe(true)
    })
  })

  describe('異常系', () => {
    const invalidTestCases = [
      {
        name: 'readHistoryIdがbigintでない場合に検証失敗すること',
        overrides: { readHistoryId: 1 },
      },
      {
        name: 'articleIdがbigintでない場合に検証失敗すること',
        overrides: { articleId: '10' },
      },
      {
        name: 'mediaが許可リストにない場合に検証失敗すること',
        overrides: { media: 'note' },
      },
      {
        name: 'urlが無効な形式の場合に検証失敗すること',
        overrides: { url: 'not-a-url' },
      },
      {
        name: 'readAtがDate型でない場合に検証失敗すること',
        overrides: { readAt: '2026-03-07' },
      },
    ]

    it.each(invalidTestCases)('$name', ({ overrides }) => {
      const result = diaryReadItemSchema.safeParse({ ...validReadItem, ...overrides })
      expect(result.success).toBe(false)
    })
  })
})
