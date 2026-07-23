import { describe, expect, it } from 'vitest'
import { skippedArticleSchema } from './skipped-article-schema'

describe('skippedArticleSchema', () => {
  const validData = {
    skippedArticleId: 1n,
    activeUserId: 10n,
    articleId: 100n,
    createdAt: new Date('2026-03-07T08:00:00.000Z'),
  }

  describe('正常系', () => {
    it('有効なスキップ済み記事データを受け入れること', () => {
      const result = skippedArticleSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('異常系', () => {
    const { skippedArticleId: _skippedArticleId, ...withoutRequiredField } = validData
    const invalidTestCases = [
      {
        name: 'skippedArticleIdがbigintでない場合に検証失敗すること',
        data: { ...validData, skippedArticleId: 1 },
      },
      {
        name: 'activeUserIdがbigintでない場合に検証失敗すること',
        data: { ...validData, activeUserId: '10' },
      },
      {
        name: 'articleIdがbigintでない場合に検証失敗すること',
        data: { ...validData, articleId: 100 },
      },
      {
        name: 'createdAtがDate型でない場合に検証失敗すること',
        data: { ...validData, createdAt: '2026-03-07' },
      },
      {
        name: '必須フィールドが欠落している場合に検証失敗すること',
        data: withoutRequiredField,
      },
    ]

    it.each(invalidTestCases)('$name', ({ data }) => {
      const result = skippedArticleSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})
