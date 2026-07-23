import { articleSchema, articleWithReadStatusSchema } from './article-schema'

describe('記事スキーマ', () => {
  const validArticle = {
    articleId: BigInt(123456789),
    media: 'qiita',
    title: 'Test Article',
    author: 'John Doe',
    description: 'This is a test article description.',
    url: 'http://example.com',
    imageUrl: null,
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
    // 書き込み経路は ARTICLE_MEDIA しか投入しない契約のため、enum で表明する
    it.each([['qiita'], ['zenn'], ['hatena']])('enum値 %s を受け入れること', (media) => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          media,
        })
      }).not.toThrow()
    })

    it.each([['news'], [''], [123], [true]])('enum外の値 %s を拒否すること', (media) => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          media,
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
          description: 'a'.repeat(1024),
        })
      }).not.toThrow()
    })

    it('無効な文字列を拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          description: 'a'.repeat(1025),
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

    it('境界値の長さのURLを受け入れること', () => {
      const baseUrl = 'https://example.com/'
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          url: baseUrl + 'a'.repeat(2048 - baseUrl.length),
        })
      }).not.toThrow()
    })

    it('最大長を超えるURLを拒否すること', () => {
      const baseUrl = 'https://example.com/'
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          url: baseUrl + 'a'.repeat(2049 - baseUrl.length),
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

  describe('imageUrl のバリデーション', () => {
    // フィードに画像が無いメディアや画像追加以前の記事が存在するため、DB 契約どおり null を許容する
    it('nullを受け入れること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          imageUrl: null,
        })
      }).not.toThrow()
    })

    it('有効なURLを受け入れること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          imageUrl: 'https://example.com/image.png',
        })
      }).not.toThrow()
    })

    it('無効なURLを拒否すること', () => {
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          imageUrl: 'invalid-url',
        })
      }).toThrow()
    })

    it('境界値の長さのURLを受け入れること', () => {
      const baseUrl = 'https://example.com/'
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          imageUrl: baseUrl + 'a'.repeat(2048 - baseUrl.length),
        })
      }).not.toThrow()
    })

    it('最大長を超えるURLを拒否すること', () => {
      const baseUrl = 'https://example.com/'
      expect(() => {
        articleSchema.parse({
          ...validArticle,
          imageUrl: baseUrl + 'a'.repeat(2049 - baseUrl.length),
        })
      }).toThrow()
    })

    it('imageUrlがない場合は拒否すること', () => {
      const { imageUrl: _imageUrl, ...articleWithoutImageUrl } = validArticle
      expect(() => {
        articleSchema.parse(articleWithoutImageUrl)
      }).toThrow()
    })
  })
})

describe('既読情報付き記事スキーマ', () => {
  const validArticleWithReadStatus = {
    articleId: BigInt(123456789),
    media: 'qiita',
    title: 'Test Article',
    author: 'John Doe',
    description: 'This is a test article description.',
    url: 'http://example.com',
    imageUrl: null,
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
