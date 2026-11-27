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
    articleId: 1,
    media: 'qiita',
    title: 'TypeScript🚀の型安全性について',
    author: '山田太郎',
    description: 'この記事では📝TypeScriptの型安全性について解説します',
    url: 'https://qiita.com/users/test+tag/items/article-title_123?page=1&sort=popular#section-1',
    createdAt: new Date('2024-01-15T09:30:15.999Z'),
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
      expect(result.articleId).toBe(BigInt(rdbArticle.articleId))
      expect(result.media).toBe(rdbArticle.media)
      expect(result.title).toBe(rdbArticle.title)
      expect(result.author).toBe(rdbArticle.author)
      expect(result.description).toBe(rdbArticle.description)
      expect(result.url).toBe(rdbArticle.url)
      expect(result.createdAt).toBe(rdbArticle.createdAt)
      expect(result).not.toBe(rdbArticle)
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
          name: 'JavaScript Number.MAX_SAFE_INTEGER超過値での処理',
          articleId: 9007199254740992n, // Number.MAX_SAFE_INTEGER + 1
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
          name: 'description最大長(1024文字)での境界値処理',
          media: 'qiita',
          title: '通常のタイトル',
          author: '通常の著者',
          description: 'あ'.repeat(1024),
          url: 'https://example.com',
        },
        {
          name: '現実的な日本語記事データでの処理',
          media: 'qiita',
          title: 'TypeScript🚀の型安全性について',
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
  })

  describe('例外・制約違反', () => {
    // DBのmediaは任意文字列のため、破損データを既知媒体に補完せず送出する。
    it.each([[''], ['news'], ['Qiita']])(
      '未知の media %j は契約違反として送出すること',
      (media) => {
        const rdbArticle = createMockRdbArticle({ media })
        expect(() => fromRdbToArticle(rdbArticle)).toThrow('Article row has unknown media')
      },
    )
  })
})
