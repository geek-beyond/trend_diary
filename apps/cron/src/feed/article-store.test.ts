import type { D1Database } from '@cloudflare/workers-types'
import { articles } from '@trend-diary/datastore/schema'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import TEST_ENV from '../test-helper/env'
import { countArticles, findByUrl, testRdb as db } from '../test-helper/rdb'
import { storeArticles, updateArticleOgImageUrls } from './article-store'
import type { NormalizedItem } from './config'

function normalizedItem(overrides: Partial<NormalizedItem> = {}): NormalizedItem {
  return {
    title: 'title',
    author: 'author',
    description: 'description',
    url: 'https://example.com/default',
    ...overrides,
  }
}

beforeEach(async () => {
  await db.delete(articles)
})

afterAll(async () => {
  await db.delete(articles)
})

describe('storeArticles', () => {
  describe('正常系', () => {
    it('items が空配列の場合は DB へアクセスせず ok(空配列) を返す', async () => {
      const result = await storeArticles('qiita', [], TEST_ENV)

      expect(result._unsafeUnwrap()).toEqual([])
      expect(await countArticles()).toBe(0)
    })

    // storeArticles は挿入のみを担い、og:image は挿入で判明した新規URLに対してのみ
    // 後続の updateArticleOgImageUrls が解決・書き戻す。挿入時点で null なのはその二段設計の途中状態
    it('挿入した記事のURL一覧を返し、og:image解決前のため ogImageUrl は挿入時点では null になる', async () => {
      const result = await storeArticles(
        'qiita',
        [normalizedItem({ url: 'https://example.com/a' })],
        TEST_ENV,
      )

      expect(result._unsafeUnwrap()).toEqual(['https://example.com/a'])
      expect((await findByUrl('https://example.com/a')).ogImageUrl).toBeNull()
    })

    // D1のバインドパラメータ上限100・使用率80%・カラム数5から算出されるチャンクサイズは16件。
    const chunkBoundaryCases = [
      { label: 'ちょうどの件数は1回で全件保存する', count: 16 },
      { label: 'を1件超えると複数回に分けて全件保存する', count: 17 },
    ]

    it.each(chunkBoundaryCases)(
      'バインドパラメータ上限から算出したチャンクサイズ$label',
      async ({ count }) => {
        const items = Array.from({ length: count }, (_, i) =>
          normalizedItem({ url: `https://example.com/chunk/${count}/${i}` }),
        )

        const result = await storeArticles('qiita', items, TEST_ENV)

        expect(result._unsafeUnwrap()).toHaveLength(count)
        expect(await countArticles()).toBe(count)
      },
    )
  })

  describe('異常系', () => {
    it('DB呼び出しが失敗した場合はerrを返す', async () => {
      const dbError = new Error('D1 connection error')
      const failingDb: Partial<D1Database> = {
        prepare: () => {
          throw dbError
        },
      }

      const result = await storeArticles('qiita', [normalizedItem()], {
        // oxlint-disable-next-line typescript/consistent-type-assertions -- 外部型の D1Database は多数のプロパティを持つため、prepare のみを実装したモックをアサーションで渡します
        DB: failingDb as D1Database,
        LOG_LEVEL: 'silent',
      })

      expect(result._unsafeUnwrapErr().message).toBe(dbError.message)
      expect(await countArticles()).toBe(0)
    })
  })
})

describe('updateArticleOgImageUrls', () => {
  describe('正常系', () => {
    it('entries が空配列の場合は DB へアクセスせず ok(0) を返す', async () => {
      const result = await updateArticleOgImageUrls([], TEST_ENV)

      expect(result._unsafeUnwrap()).toBe(0)
    })

    it('指定した URL の記事の ogImageUrl を一括更新する', async () => {
      await storeArticles(
        'qiita',
        [
          normalizedItem({ url: 'https://example.com/a' }),
          normalizedItem({ url: 'https://example.com/b' }),
          normalizedItem({ url: 'https://example.com/c' }),
        ],
        TEST_ENV,
      )

      const result = await updateArticleOgImageUrls(
        [
          { url: 'https://example.com/a', ogImageUrl: 'https://example.com/a.png' },
          { url: 'https://example.com/b', ogImageUrl: 'https://example.com/b.png' },
        ],
        TEST_ENV,
      )

      expect(result._unsafeUnwrap()).toBe(2)
      expect((await findByUrl('https://example.com/a')).ogImageUrl).toBe(
        'https://example.com/a.png',
      )
      expect((await findByUrl('https://example.com/b')).ogImageUrl).toBe(
        'https://example.com/b.png',
      )
      expect((await findByUrl('https://example.com/c')).ogImageUrl).toBeNull()
    })
  })

  describe('異常系', () => {
    it('DB呼び出しが失敗した場合はerrを返す', async () => {
      const dbError = new Error('D1 connection error')
      const failingDb: Partial<D1Database> = {
        prepare: () => {
          throw dbError
        },
      }

      const result = await updateArticleOgImageUrls(
        [{ url: 'https://example.com/a', ogImageUrl: 'https://example.com/a.png' }],
        {
          // oxlint-disable-next-line typescript/consistent-type-assertions -- 外部型の D1Database は多数のプロパティを持つため、prepare のみを実装したモックをアサーションで渡します
          DB: failingDb as D1Database,
          LOG_LEVEL: 'silent',
        },
      )

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error)
    })
  })
})
