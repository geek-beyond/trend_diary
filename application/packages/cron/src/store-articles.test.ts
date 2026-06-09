import { env } from 'cloudflare:test'
import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { storeArticles } from './store-articles'
import { testRdb as db } from './test-helper/rdb'

const cronEnv = { DB: env.DB }

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
    expect(await db.select().from(articles)).toHaveLength(0)
  })

  it('複数記事をmedia付きで保存する', async () => {
    const result = await storeArticles(
      'qiita',
      [
        { title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' },
        { title: '記事B', author: '投稿者B', description: '本文B', url: 'https://example.com/b' },
      ],
      cronEnv,
    )

    expect(result._unsafeUnwrap()).toBe(2)
    const rows = await db.select().from(articles).orderBy(articles.url)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      media: 'qiita',
      title: '記事A',
      author: '投稿者A',
      description: '本文A',
      url: 'https://example.com/a',
    })
    expect(rows[1]).toMatchObject({
      media: 'qiita',
      title: '記事B',
      author: '投稿者B',
      description: '本文B',
      url: 'https://example.com/b',
    })
  })

  it('同一URLの重複記事は1件だけ保存する', async () => {
    const result = await storeArticles(
      'hatena',
      [
        { title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' },
        {
          title: '記事A重複',
          author: '投稿者A',
          description: '本文A重複',
          url: 'https://example.com/a',
        },
      ],
      cronEnv,
    )

    expect(result._unsafeUnwrap()).toBe(1)
    expect(await db.select().from(articles)).toHaveLength(1)
  })

  it('既にDBへ保存済みのURLは再保存されない', async () => {
    const items = [
      { title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' },
    ]

    expect((await storeArticles('hatena', items, cronEnv))._unsafeUnwrap()).toBe(1)
    expect((await storeArticles('hatena', items, cronEnv))._unsafeUnwrap()).toBe(0)
    expect(await db.select().from(articles)).toHaveLength(1)
  })

  it('保存済みURLと新規URLが混在する場合は新規分のみ保存する', async () => {
    await storeArticles(
      'hatena',
      [{ title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' }],
      cronEnv,
    )

    const result = await storeArticles(
      'hatena',
      [
        { title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' },
        { title: '記事B', author: '投稿者B', description: '本文B', url: 'https://example.com/b' },
      ],
      cronEnv,
    )

    expect(result._unsafeUnwrap()).toBe(1)
    const urls = (await db.select({ url: articles.url }).from(articles)).map((row) => row.url)
    expect(urls).toHaveLength(2)
    expect(urls).toContain('https://example.com/b')
  })

  it('最大長を超えるフィールドはコードポイント単位で切り詰める', async () => {
    await storeArticles(
      'hatena',
      [
        {
          title: 'あ'.repeat(120),
          author: 'い'.repeat(40),
          description: '本文',
          url: 'https://example.com/long',
        },
      ],
      cronEnv,
    )

    const [saved] = await db.select().from(articles)
    expect([...saved.title]).toHaveLength(100)
    expect([...saved.author]).toHaveLength(30)
  })
})
