import { articleQuerySchema } from './query-schema'

describe('記事検索スキーマ', () => {
  it('有効な記事検索パラメータを受け入れること', () => {
    expect(() => {
      articleQuerySchema.parse({
        title: 'テスト記事',
        author: 'テスト著者',
        media: 'qiita',
        from: '2024-01-01',
        to: '2024-01-31',
        readStatus: false,
      })
    }).not.toThrow()
  })

  it('空のオブジェクトを受け入れること', () => {
    expect(() => {
      articleQuerySchema.parse({})
    }).not.toThrow()
  })

  describe('title のバリデーション', () => {
    it('有効な文字列のtitleを受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          title: 'テスト記事タイトル',
        })
      }).not.toThrow()
    })

    it('空文字列のtitleを受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          title: '',
        })
      }).not.toThrow()
    })

    it('文字列以外のtitleを拒否すること', () => {
      expect(() => {
        articleQuerySchema.parse({
          title: 123,
        })
      }).toThrow()
    })
  })

  describe('author のバリデーション', () => {
    it('有効な文字列のauthorを受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          author: 'テスト著者',
        })
      }).not.toThrow()
    })

    it('空文字列のauthorを受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          author: '',
        })
      }).not.toThrow()
    })

    it('文字列以外のauthorを拒否すること', () => {
      expect(() => {
        articleQuerySchema.parse({
          author: 123,
        })
      }).toThrow()
    })
  })

  describe('media のバリデーション', () => {
    it('有効なmedia値を受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          media: 'qiita',
        })
      }).not.toThrow()

      expect(() => {
        articleQuerySchema.parse({
          media: 'zenn',
        })
      }).not.toThrow()

      expect(() => {
        articleQuerySchema.parse({
          media: 'hatena',
        })
      }).not.toThrow()
    })

    it('無効なmedia値を拒否すること', () => {
      expect(() => {
        articleQuerySchema.parse({
          media: 'invalid',
        })
      }).toThrow()

      expect(() => {
        articleQuerySchema.parse({
          media: 'note',
        })
      }).toThrow()
    })
  })

  describe('readStatus のバリデーション', () => {
    it('有効なreadStatus値を受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          readStatus: false,
        })
      }).not.toThrow()

      expect(() => {
        articleQuerySchema.parse({
          readStatus: true,
        })
      }).not.toThrow()
    })

    it('無効なreadStatus値を拒否すること', () => {
      expect(() => {
        articleQuerySchema.parse({
          readStatus: '2',
        })
      }).toThrow()

      expect(() => {
        articleQuerySchema.parse({
          readStatus: 'true',
        })
      }).toThrow()

      expect(() => {
        articleQuerySchema.parse({
          readStatus: 0,
        })
      }).toThrow()
    })
  })

  describe('from のバリデーション', () => {
    it('有効な日付形式を受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          from: '2024-01-01',
        })
      }).not.toThrow()

      expect(() => {
        articleQuerySchema.parse({
          from: '2023-12-31',
        })
      }).not.toThrow()
    })

    it('無効な日付形式を拒否すること', () => {
      expect(() => {
        articleQuerySchema.parse({
          from: '2024/01/01',
        })
      }).toThrow()

      expect(() => {
        articleQuerySchema.parse({
          from: '24-01-01',
        })
      }).toThrow()

      expect(() => {
        articleQuerySchema.parse({
          from: '2024-1-1',
        })
      }).toThrow()

      expect(() => {
        articleQuerySchema.parse({
          from: 'invalid-date',
        })
      }).toThrow()
    })
  })

  describe('to のバリデーション', () => {
    it('有効な日付形式を受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          to: '2024-01-01',
        })
      }).not.toThrow()

      expect(() => {
        articleQuerySchema.parse({
          to: '2023-12-31',
        })
      }).not.toThrow()
    })

    it('無効な日付形式を拒否すること', () => {
      expect(() => {
        articleQuerySchema.parse({
          to: '2024/01/01',
        })
      }).toThrow()

      expect(() => {
        articleQuerySchema.parse({
          to: '24-01-01',
        })
      }).toThrow()

      expect(() => {
        articleQuerySchema.parse({
          to: '2024-1-1',
        })
      }).toThrow()

      expect(() => {
        articleQuerySchema.parse({
          to: 'invalid-date',
        })
      }).toThrow()
    })
  })

  describe('複合パラメータのバリデーション', () => {
    it('複数の有効なパラメータの組み合わせを受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          title: 'React入門',
          media: 'qiita',
          readStatus: false,
        })
      }).not.toThrow()
    })

    it('一部が無効なパラメータの組み合わせを拒否すること', () => {
      expect(() => {
        articleQuerySchema.parse({
          title: 'React入門',
          media: 'invalid',
          readStatus: false,
        })
      }).toThrow()
    })

    it('from と to の組み合わせを受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          from: '2024-01-01',
          to: '2024-01-31',
        })
      }).not.toThrow()
    })

    it('from のみを受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          from: '2024-01-01',
        })
      }).not.toThrow()
    })

    it('to のみを受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          to: '2024-01-31',
        })
      }).not.toThrow()
    })

    it('from が to より後の日付の場合を拒否すること', () => {
      expect(() => {
        articleQuerySchema.parse({
          from: '2024-01-31',
          to: '2024-01-01',
        })
      }).toThrow()
    })

    it('from と to が同じ日付の場合を受け入れること', () => {
      expect(() => {
        articleQuerySchema.parse({
          from: '2024-01-01',
          to: '2024-01-01',
        })
      }).not.toThrow()
    })
  })
})
