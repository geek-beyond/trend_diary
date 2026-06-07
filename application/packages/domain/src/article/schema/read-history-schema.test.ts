import { describe, expect, it } from 'vitest'
import { readHistorySchema } from './read-history-schema'

describe('readHistorySchema', () => {
  const validData = {
    readHistoryId: 1n,
    activeUserId: 10n,
    articleId: 100n,
    readAt: new Date('2026-03-07T08:00:00.000Z'),
    createdAt: new Date('2026-03-07T08:00:00.000Z'),
  }

  describe('正常系', () => {
    it('有効な読了履歴データを受け入れること', () => {
      const result = readHistorySchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('異常系', () => {
    const { readHistoryId: _readHistoryId, ...withoutRequiredField } = validData
    const invalidTestCases = [
      {
        name: 'readHistoryIdがbigintでない場合に検証失敗すること',
        data: { ...validData, readHistoryId: 1 },
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
        name: 'readAtがDate型でない場合に検証失敗すること',
        data: { ...validData, readAt: '2026-03-07' },
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
      const result = readHistorySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})
