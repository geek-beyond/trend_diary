import type { Article as RdbArticle } from '@trend-diary/datastore/schema'
import { describe, expect, it } from 'vitest'
import fromRdbToArticle from './mapper'

// テストデータ作成ヘルパー
// スキーマ上のID列は number 型だが、mapper が bigint を透過することを検証するため
// テストでは意図的に bigint 値を注入する。そのため override は unknown を許容する
const createMockRdbArticle = (
  overrides: Partial<Record<keyof RdbArticle, string | number | bigint | Date | null>> = {},
): RdbArticle => {
  const rdbArticle = {
    articleId: 1n,
    media: 'qiita',
    title: 'TypeScriptの型安全性について',
    author: '山田太郎',
    description: 'TypeScriptの型安全性に関する解説記事です',
    url: 'https://example.com/article/1',
    createdAt: new Date('2024-01-15T09:30:00Z'),
    ...overrides,
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- ID列の宣言型(number)に対し bigint のテスト値を注入するため、型システムの迂回が避けられないためです
  return rdbArticle as unknown as RdbArticle
}

describe('fromRdbToArticle', () => {
  describe('基本動作', () => {
    it('標準的なArticleデータで全フィールドが正確にマッピングされること', () => {
      // Arrange
      const rdbArticle = createMockRdbArticle()

      // Act
      const result = fromRdbToArticle(rdbArticle)

      // Assert
      expect(result).toBeDefined()
      expect(result.articleId).toBe(rdbArticle.articleId)
      expect(result.media).toBe(rdbArticle.media)
      expect(result.title).toBe(rdbArticle.title)
      expect(result.author).toBe(rdbArticle.author)
      expect(result.description).toBe(rdbArticle.description)
      expect(result.url).toBe(rdbArticle.url)
      expect(result.createdAt).toEqual(rdbArticle.createdAt)
    })

    it('結果オブジェクトがRdbオブジェクトとは独立したArticleインスタンスであること', () => {
      // Arrange
      const rdbArticle = createMockRdbArticle()

      // Act
      const result = fromRdbToArticle(rdbArticle)

      // Assert - インスタンス独立性の確認
      expect(result).not.toBe(rdbArticle)
      expect(result).toBeDefined()

      // Dateオブジェクトは同じ参照を持つ（mapperの実装仕様）
      expect(result.createdAt).toBe(rdbArticle.createdAt)

      // プリミティブ値は値で比較される
      expect(result.articleId).toBe(rdbArticle.articleId)
      expect(result.media).toBe(rdbArticle.media)
      expect(result.title).toBe(rdbArticle.title)
      expect(result.author).toBe(rdbArticle.author)
      expect(result.description).toBe(rdbArticle.description)
      expect(result.url).toBe(rdbArticle.url)
    })
  })

  describe('境界値・特殊値', () => {
    describe('bigint型の境界値テスト', () => {
      const bigintTestCases = [
        {
          name: '最小値(0)での境界値処理',
          articleId: 0n,
        },
        {
          name: '通常の正の値での処理',
          articleId: 12345n,
        },
        {
          name: 'JavaScript Number.MAX_SAFE_INTEGER相当値での処理',
          articleId: 9007199254740991n, // Number.MAX_SAFE_INTEGER
        },
        {
          name: 'JavaScript Number.MAX_SAFE_INTEGER超過値での処理',
          articleId: 9007199254740992n, // Number.MAX_SAFE_INTEGER + 1
        },
        {
          name: '非常に大きなbigint値での処理',
          articleId: 123456789012345678901234567890n,
        },
      ]

      it.each(bigintTestCases)('$name', ({ articleId }) => {
        // Arrange
        const rdbArticle = createMockRdbArticle({ articleId })

        // Act
        const result = fromRdbToArticle(rdbArticle)

        // Assert
        expect(result.articleId).toBe(articleId)
        expect(typeof result.articleId).toBe('bigint')

        // 数値の正確性確認（文字列変換で比較）
        expect(result.articleId.toString()).toBe(articleId.toString())
      })
    })

    describe('文字列制約の境界値テスト', () => {
      const stringConstraintTestCases = [
        {
          name: '空文字列での境界値処理',
          media: 'qiita',
          title: '',
          author: '',
          description: '',
          url: '',
        },
        {
          name: 'title最大長(100文字)での境界値処理',
          media: 'qiita',
          title: 'あ'.repeat(100),
          author: '通常の著者',
          description: '通常の説明',
          url: 'https://example.com',
        },
        {
          name: 'author最大長(30文字)での境界値処理',
          media: 'qiita',
          title: '通常のタイトル',
          author: 'A'.repeat(30),
          description: '通常の説明',
          url: 'https://example.com',
        },
        {
          name: 'description最大長(1024文字)での境界値処理',
          media: 'qiita',
          title: '通常のタイトル',
          author: '通常の著者',
          description: 'あ'.repeat(1024),
          url: 'https://example.com',
        },
        {
          name: '非常に長いURL(10000文字)での処理',
          media: 'qiita',
          title: '通常のタイトル',
          author: '通常の著者',
          description: '通常の説明',
          url: `https://example.com/${'a'.repeat(9980)}`,
        },
        {
          name: '現実的な日本語記事データでの処理',
          media: 'qiita',
          title: 'TypeScriptの型安全性について',
          author: '山田太郎',
          description:
            'この記事ではTypeScriptの型安全性について、実例を交えながら詳しく解説していきます。',
          url: 'https://qiita.com/yamada-taro/items/typescript-type-safety-guide',
        },
      ]

      it.each(stringConstraintTestCases)('$name', ({ media, title, author, description, url }) => {
        // Arrange
        const rdbArticle = createMockRdbArticle({
          media,
          title,
          author,
          description,
          url,
        })

        // Act
        const result = fromRdbToArticle(rdbArticle)

        // Assert
        expect(result.media).toBe(media)
        expect(result.title).toBe(title)
        expect(result.author).toBe(author)
        expect(result.description).toBe(description)
        expect(result.url).toBe(url)

        expect(result.media.length).toBeLessThanOrEqual(10)
        expect(result.title.length).toBeLessThanOrEqual(100)
        expect(result.author.length).toBeLessThanOrEqual(30)
        expect(result.description.length).toBeLessThanOrEqual(1024)
        // urlはText型のため制限なし
      })
    })

    describe('Date型の特殊ケーステスト', () => {
      const dateTestCases = [
        {
          name: 'Unix epoch(1970-01-01)での境界値処理',
          createdAt: new Date('1970-01-01T00:00:00.000Z'),
        },
        {
          name: '1970年以前の日時での境界値処理',
          createdAt: new Date('1969-12-31T23:59:59.999Z'),
        },
        {
          name: '遠い未来の日時での境界値処理',
          createdAt: new Date('2099-12-31T23:59:59.999Z'),
        },
        {
          name: 'ミリ秒精度での境界値処理',
          createdAt: new Date('2024-01-15T09:30:15.123Z'),
        },
        {
          name: 'タイムゾーンを含む日時での処理',
          createdAt: new Date('2024-01-15T18:30:15+09:00'), // JST
        },
      ]

      it.each(dateTestCases)('$name', ({ createdAt }) => {
        // Arrange
        const rdbArticle = createMockRdbArticle({ createdAt })

        // Act
        const result = fromRdbToArticle(rdbArticle)

        // Assert
        expect(result.createdAt).toEqual(createdAt)
        expect(result.createdAt).toBeInstanceOf(Date)

        // Dateオブジェクトの参照共有（mapperの実装仕様）
        expect(result.createdAt).toBe(createdAt)

        // タイムスタンプ値の正確性確認
        expect(result.createdAt.getTime()).toBe(createdAt.getTime())
      })
    })
  })

  describe('例外・制約違反', () => {
    describe('データ一貫性とマッピング精度テスト', () => {
      it('特殊文字を含むurlが正確にマッピングされること', () => {
        // Arrange
        const specialUrl =
          'https://qiita.com/users/test+tag/items/article-title_123?page=1&sort=popular#section-1'
        const rdbArticle = createMockRdbArticle({
          url: specialUrl,
        })

        // Act
        const result = fromRdbToArticle(rdbArticle)

        // Assert
        expect(result.url).toBe(specialUrl)
        // 特殊文字が保持されることを確認
        expect(result.url).toContain('+')
        expect(result.url).toContain('?')
        expect(result.url).toContain('&')
        expect(result.url).toContain('#')
        expect(result.url).toContain('_')
      })

      // DB の media カラムは任意文字列のため、未知の値＝データ破損は補完せず契約違反として送出する
      it.each([[''], ['news'], ['Qiita']])(
        '未知の media %j は契約違反として送出すること',
        (media) => {
          const rdbArticle = createMockRdbArticle({ media })

          expect(() => fromRdbToArticle(rdbArticle)).toThrow('Article row has unknown media')
        },
      )

      it('日本語・絵文字を含むtitleとdescriptionが正確にマッピングされること', () => {
        // Arrange
        const unicodeTitle = 'TypeScript🚀の型安全性について'
        const unicodeDescription = 'この記事では📝TypeScriptの型安全性について解説します'
        const rdbArticle = createMockRdbArticle({
          title: unicodeTitle,
          description: unicodeDescription,
        })

        // Act
        const result = fromRdbToArticle(rdbArticle)

        // Assert
        expect(result.title).toBe(unicodeTitle)
        expect(result.description).toBe(unicodeDescription)
        expect(result.title).toContain('🚀')
        expect(result.description).toContain('📝')
        // Unicode文字列長の確認
        expect(result.title.length).toBe(unicodeTitle.length)
        expect(result.description.length).toBe(unicodeDescription.length)
      })
    })

    describe('極限値でのマッピング安定性テスト', () => {
      it('64bit整数上限に近い値でのマッピング精度テスト', () => {
        // Arrange
        // SQLite integerの最大値は 9223372036854775807
        const nearMaxBigInt = 9223372036854775806n
        const rdbArticle = createMockRdbArticle({
          articleId: nearMaxBigInt,
        })

        // Act
        const result = fromRdbToArticle(rdbArticle)

        // Assert
        expect(result.articleId).toBe(nearMaxBigInt)
        expect(typeof result.articleId).toBe('bigint')
        // 文字列変換での精度確認
        expect(result.articleId.toString()).toBe('9223372036854775806')
      })

      it('ミリ秒境界でのDate型マッピング精度テスト', () => {
        // Arrange
        const preciseDate = new Date('2024-01-15T09:30:15.999Z')
        const rdbArticle = createMockRdbArticle({
          createdAt: preciseDate,
        })

        // Act
        const result = fromRdbToArticle(rdbArticle)

        // Assert
        expect(result.createdAt.getTime()).toBe(preciseDate.getTime())

        // ミリ秒レベルでの精度確認
        expect(result.createdAt.getMilliseconds()).toBe(999)
      })
    })
  })
})
