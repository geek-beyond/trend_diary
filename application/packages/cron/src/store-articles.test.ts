import { env } from 'cloudflare:test'
import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { type FeedItem, storeArticles } from './store-articles'
import { testRdb as db } from './test-helper/rdb'

const cronEnv = { DB: env.DB }

function feedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    title: '記事タイトル',
    author: '投稿者',
    description: '本文',
    url: 'https://example.com/1',
    ...overrides,
  }
}

async function countArticles(): Promise<number> {
  const rows = await db.select({ url: articles.url }).from(articles)
  return rows.length
}

async function findByUrl(url: string) {
  const [row] = await db.select().from(articles).where(eq(articles.url, url)).limit(1)
  return row
}

describe('storeArticles', () => {
  beforeEach(async () => {
    await db.delete(articles)
  })

  afterAll(async () => {
    await db.delete(articles)
  })

  it('itemsが空の場合は何も保存せず0を返す', async () => {
    const result = await storeArticles('hatena', [], cronEnv)

    expect(result._unsafeUnwrap()).toBe(0)
    expect(await countArticles()).toBe(0)
  })

  it('D1互換のため記事は1件ずつ保存する', async () => {
    const result = await storeArticles(
      'hatena',
      [
        feedItem({ author: '投稿者A', url: 'https://example.com/a' }),
        feedItem({ author: '投稿者B', url: 'https://example.com/b' }),
      ],
      cronEnv,
    )

    expect(result._unsafeUnwrap()).toBe(2)
    expect(await countArticles()).toBe(2)
    expect((await findByUrl('https://example.com/a')).author).toBe('投稿者A')
    expect((await findByUrl('https://example.com/b')).author).toBe('投稿者B')
  })

  it('mediaが指定どおり保存される', async () => {
    await storeArticles('qiita', [feedItem({ url: 'https://example.com/q' })], cronEnv)

    expect((await findByUrl('https://example.com/q')).media).toBe('qiita')
  })

  it('同一URLの重複記事は1件だけ保存する', async () => {
    const result = await storeArticles(
      'hatena',
      [
        feedItem({ title: '記事A', url: 'https://example.com/a' }),
        feedItem({ title: '記事A重複', url: 'https://example.com/a' }),
      ],
      cronEnv,
    )

    expect(result._unsafeUnwrap()).toBe(1)
    expect(await countArticles()).toBe(1)
  })

  it('既にDBへ保存済みのURLは一意制約により再保存されない', async () => {
    const items = [feedItem({ url: 'https://example.com/a' })]

    const firstResult = await storeArticles('hatena', items, cronEnv)
    expect(firstResult._unsafeUnwrap()).toBe(1)
    expect(await countArticles()).toBe(1)

    const secondResult = await storeArticles('hatena', items, cronEnv)
    expect(secondResult._unsafeUnwrap()).toBe(0)
    expect(await countArticles()).toBe(1)
  })

  it('保存済みURLと新規URLが混在する場合は新規分のみ保存する', async () => {
    await storeArticles('hatena', [feedItem({ url: 'https://example.com/a' })], cronEnv)

    const result = await storeArticles(
      'hatena',
      [
        feedItem({ url: 'https://example.com/a' }),
        feedItem({ author: '投稿者B', url: 'https://example.com/b' }),
      ],
      cronEnv,
    )

    expect(result._unsafeUnwrap()).toBe(1)
    expect(await countArticles()).toBe(2)
    expect((await findByUrl('https://example.com/b')).author).toBe('投稿者B')
  })

  it('最大長を超えるフィールドはコードポイント単位で切り詰める', async () => {
    await storeArticles(
      'hatena',
      [
        feedItem({
          title: 'あ'.repeat(120),
          author: 'い'.repeat(40),
          url: 'https://example.com/long',
        }),
      ],
      cronEnv,
    )

    const saved = await findByUrl('https://example.com/long')
    expect([...saved.title]).toHaveLength(100)
    expect([...saved.author]).toHaveLength(30)
  })
})
