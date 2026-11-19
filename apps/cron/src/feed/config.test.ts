import { describe, expect, it } from 'vitest'
import { normalizedItemSchema } from './config'

describe('normalizedItemSchema', () => {
  it('必須テキストの前後の空白を取り除く', () => {
    const result = normalizedItemSchema.parse({
      title: ' タイトル ',
      author: ' 著者 ',
      description: null,
      url: ' https://example.com/article ',
    })

    expect(result).toEqual({
      title: 'タイトル',
      author: '著者',
      description: '',
      url: 'https://example.com/article',
    })
  })

  it('必須テキストが空白だけなら不正として扱う', () => {
    const result = normalizedItemSchema.safeParse({
      title: '   ',
      author: '著者',
      description: '本文',
      url: 'https://example.com/article',
    })

    expect(result.success).toBe(false)
  })
})
