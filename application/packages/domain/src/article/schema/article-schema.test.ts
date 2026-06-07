import { articleSchema, articleWithReadStatusSchema } from './article-schema'

describe('記事スキーマ', () => {
  const validArticle = {
    articleId: BigInt(123456789),
    media: 'news',
    title: 'Test Article',
    author: 'John Doe',
    description: 'This is a test article description.',
    url: 'http://example.com',
    createdAt: new Date(),
  }

  it('有効な記事データを受け入れること', () => {
    expect(() => {
      articleSchema.parse(validArticle)
    }).not.toThrow()
  })

  describe('articleId のバリデーション', () => {
    it('有効なbigint型のarticleIdを受け入れること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          articleId: BigInt(987654321),
        })
      }).not.toThrow()
    })

    it('bigint型でないarticleIdを拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          articleId: '123456789',
        })
      }).toThrow()

      expect(() => {
        articleSchema.parse({
          ...validArticle,
          articleId: 123456789,
        })
      }).toThrow()
    })
  })

  describe('media のバリデーション', () => {
    it('境界値の文字列を受け入れること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          media: 'a'.repeat(10),
        })
      }).not.toThrow()
    })

    it('無効な文字列を拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          media: 'a'.repeat(11),
        })
      }).toThrow()
    })

    it('String型でないmediaを拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          media: 123,
        })
      }).toThrow()

      expect(() => {
        articleSchema.parse({
          ...validArticle,
          media: true,
        })
      }).toThrow()
    })
  })

  describe('title のバリデーション', () => {
    it('境界値の文字列を受け入れること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          title: 'a'.repeat(100),
        })
      }).not.toThrow()
    })

    it('無効な文字列を拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          title: 'a'.repeat(101),
        })
      }).toThrow()
    })

    it('String型でないtitleを拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          title: 123,
        })
      }).toThrow()

      expect(() => {
        articleSchema.parse({
          ...validArticle,
          title: true,
        })
      }).toThrow()
    })
  })

  describe('author のバリデーション', () => {
    it('境界値の文字列を受け入れること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          author: 'a'.repeat(30),
        })
      }).not.toThrow()
    })
    it('無効な文字列を拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          author: 'a'.repeat(31),
        })
      }).toThrow()
    })
    it('String型でないauthorを拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          author: 123,
        })
      }).toThrow()
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          author: true,
        })
      }).toThrow()
    })
  })
  describe('description のバリデーション', () => {
    it('境界値の長さの文字列を受け入れること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          description: 'a'.repeat(255),
        })
      }).not.toThrow()
    })

    it('無効な文字列を拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          description: 'a'.repeat(256),
        })
      }).toThrow()
    })

    it('String型でないdescriptionを拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          description: 123,
        })
      }).toThrow()

      expect(() => {
        articleSchema.parse({
          ...validArticle,
          description: true,
        })
      }).toThrow()
    })
  })
  describe('url のバリデーション', () => {
    it('有効なURLを受け入れること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          url: 'http://example.com/article',
        })
      }).not.toThrow()
    })

    it('無効なURLを拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          url: 'invalid-url',
        })
      }).toThrow()
    })

    it('String型でないurlを拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          url: 123,
        })
      }).toThrow()

      expect(() => {
        articleSchema.parse({
          ...validArticle,
          url: true,
        })
      }).toThrow()
    })
  })
})

describe('既読情報付き記事スキーマ', () => {
  const validArticleWithReadStatus = {
    articleId: BigInt(123456789),
    media: 'news',
    title: 'Test Article',
    author: 'John Doe',
    description: 'This is a test article description.',
    url: 'http://example.com',
    createdAt: new Date(),
    isRead: false,
  }

  it('有効な既読情報付き記事データを受け入れること', () => {
    expect(() => {
      articleWithReadStatusSchema.parse(validArticleWithReadStatus)
    }).not.toThrow()
  })

  it('isReadがtrueの場合も受け入れること', () => {
    expect(() => {
      articleWithReadStatusSchema.parse({
        ...validArticleWithReadStatus,
        isRead: true,
      })
    }).not.toThrow()
  })

  it('isReadがboolean型でない場合は拒否すること', () => {
    expect(() => {
      articleWithReadStatusSchema.parse({
        ...validArticleWithReadStatus,
        isRead: 'true',
      })
    }).toThrow()

    expect(() => {
      articleWithReadStatusSchema.parse({
        ...validArticleWithReadStatus,
        isRead: 1,
      })
    }).toThrow()
  })

  it('isReadがない場合は拒否すること', () => {
    const { isRead: _isRead, ...articleWithoutIsRead } = validArticleWithReadStatus
    expect(() => {
      articleWithReadStatusSchema.parse(articleWithoutIsRead)
    }).toThrow()
  })
})
