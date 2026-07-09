import type { D1Database } from '@cloudflare/workers-types'
import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import TEST_ENV from '../test-helper/env'
import { testRdb as db } from '../test-helper/rdb'
import { storeArticles } from './article-store'
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

async function countArticles(): Promise<number> {
  const rows = await db.select({ url: articles.url }).from(articles)
  return rows.length
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

    // D1のバインドパラメータ上限100・使用率80%・カラム数5から算出されるチャンクサイズは16件。境界値で検証する。
    it('バインドパラメータ上限から算出したチャンクサイズちょうどの件数は1回で全件保存する', async () => {
      const items = Array.from({ length: 16 }, (_, i) =>
        normalizedItem({ url: `https://example.com/chunk-boundary/${i}` }),
      )

      const result = await storeArticles('qiita', items, TEST_ENV)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(16)
      expect(await countArticles()).toBe(16)
    })

    it('チャンクサイズを1件超えると複数回に分けて全件保存する', async () => {
      const items = Array.from({ length: 17 }, (_, i) =>
        normalizedItem({ url: `https://example.com/chunk-overflow/${i}` }),
      )

      const result = await storeArticles('qiita', items, TEST_ENV)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(17)
      expect(await countArticles()).toBe(17)
    })
  })

  describe('異常系', () => {
    it('DB呼び出しが失敗した場合はerrを返す', async () => {
      const dbError = new Error('D1 connection error')
      // oxlint-disable-next-line typescript/consistent-type-assertions -- 外部型のモックのため、必要なプロパティのみのオブジェクトをアサーションで渡す
      const failingDb = {
        prepare: () => {
          throw dbError
        },
      } as unknown as D1Database

      const result = await storeArticles('qiita', [normalizedItem()], {
        DB: failingDb,
        LOG_LEVEL: 'silent',
      })

      expect(result.isErr()).toBe(true)
      if (result.isErr()) expect(result.error.message).toBe(dbError.message)
      expect(await countArticles()).toBe(0)
    })
  })
})
