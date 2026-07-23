import type { D1Database } from '@cloudflare/workers-types'
import { articles } from '@trend-diary/datastore/schema'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import TEST_ENV from '../test-helper/env'
import { countArticles, findByUrl, testRdb as db } from '../test-helper/rdb'
import { type ArticleWithOgImage, storeArticles } from './article-store'

function articleWithOgImage(overrides: Partial<ArticleWithOgImage> = {}): ArticleWithOgImage {
  return {
    title: 'title',
    author: 'author',
    description: 'description',
    url: 'https://example.com/default',
    ogImageUrl: null,
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
    it('items が空配列の場合は DB へアクセスせず ok(0) を返す', async () => {
      const result = await storeArticles('qiita', [], TEST_ENV)

      expect(result._unsafeUnwrap()).toBe(0)
      expect(await countArticles()).toBe(0)
    })

    const ogImageCases = [
      {
        label: '解決済みの ogImageUrl をそのまま保存する',
        ogImageUrl: 'https://example.com/og.png',
        expected: 'https://example.com/og.png',
      },
      {
        label: 'og:image が無い記事は ogImageUrl を null で保存する',
        ogImageUrl: null,
        expected: null,
      },
    ]

    it.each(ogImageCases)('$label', async ({ ogImageUrl, expected }) => {
      const url = 'https://example.com/a'
      const result = await storeArticles(
        'qiita',
        [articleWithOgImage({ url, ogImageUrl })],
        TEST_ENV,
      )

      expect(result._unsafeUnwrap()).toBe(1)
      expect((await findByUrl(url)).ogImageUrl).toBe(expected)
    })

    // D1のバインドパラメータ上限100・使用率80%・カラム数6から算出されるチャンクサイズは13件。
    const chunkBoundaryCases = [
      { label: 'ちょうどの件数は1回で全件保存する', count: 13 },
      { label: 'を1件超えると複数回に分けて全件保存する', count: 14 },
    ]

    it.each(chunkBoundaryCases)(
      'バインドパラメータ上限から算出したチャンクサイズ$label',
      async ({ count }) => {
        const items = Array.from({ length: count }, (_, i) =>
          articleWithOgImage({ url: `https://example.com/chunk/${count}/${i}` }),
        )

        const result = await storeArticles('qiita', items, TEST_ENV)

        expect(result._unsafeUnwrap()).toBe(count)
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

      const result = await storeArticles('qiita', [articleWithOgImage()], {
        // oxlint-disable-next-line typescript/consistent-type-assertions -- 外部型の D1Database は多数のプロパティを持つため、prepare のみを実装したモックをアサーションで渡します
        DB: failingDb as D1Database,
        LOG_LEVEL: 'silent',
      })

      expect(result._unsafeUnwrapErr().message).toBe(dbError.message)
      expect(await countArticles()).toBe(0)
    })
  })
})
