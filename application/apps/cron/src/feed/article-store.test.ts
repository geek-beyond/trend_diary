import type { D1Database } from '@cloudflare/workers-types'
import { articles } from '@trend-diary/datastore/schema'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import TEST_ENV from '../test-helper/env'
import { countArticles, testRdb as db } from '../test-helper/rdb'
import { storeArticles } from './article-store'
import type { NormalizedItem } from './config'

function normalizedItem(overrides: Partial<NormalizedItem> = {}): NormalizedItem {
  return {
    title: 'title',
    author: 'author',
    description: 'description',
    url: 'https://example.com/default',
    imageUrl: null,
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

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(0)
      expect(await countArticles()).toBe(0)
    })

    const imageUrlCases = [
      {
        label: 'imageUrl をそのまま保存する',
        imageUrl: 'https://example.com/image.png',
        expected: 'https://example.com/image.png',
      },
      { label: 'imageUrl が null の場合は null のまま保存する', imageUrl: null, expected: null },
    ]

    it.each(imageUrlCases)('$label', async ({ imageUrl, expected }) => {
      const url = 'https://example.com/image-case'
      const result = await storeArticles('zenn', [normalizedItem({ url, imageUrl })], TEST_ENV)

      expect(result.isOk()).toBe(true)
      const [saved] = await db.select().from(articles).where(eq(articles.url, url)).limit(1)
      expect(saved.imageUrl).toBe(expected)
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
          normalizedItem({ url: `https://example.com/chunk/${count}/${i}` }),
        )

        const result = await storeArticles('qiita', items, TEST_ENV)

        expect(result.isOk()).toBe(true)
        if (result.isOk()) expect(result.value).toBe(count)
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

      expect(result.isErr()).toBe(true)
      if (result.isErr()) expect(result.error.message).toBe(dbError.message)
      expect(await countArticles()).toBe(0)
    })
  })
})
