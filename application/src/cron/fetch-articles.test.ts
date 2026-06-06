import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.hoisted(() => vi.fn())
const parseStringMock = vi.hoisted(() => vi.fn())

vi.stubGlobal('fetch', fetchMock)

vi.mock('rss-parser', () => ({
  default: class MockParser {
    parseString(xml: string) {
      return parseStringMock(xml)
    }
  },
}))

import { env } from 'cloudflare:test'
import { fetchHatenaArticles } from '@/cron/fetch-articles'
import { articles } from '@/infrastructure/drizzle-orm/schema'
import { testRdb } from '@/test/helper/rdb'

const db = testRdb
const cronEnv = { DB: env.DB }

async function countArticles(): Promise<number> {
  const rows = await db.select({ url: articles.url }).from(articles)
  return rows.length
}

async function findByUrl(url: string) {
  const [row] = await db.select().from(articles).where(eq(articles.url, url)).limit(1)
  return row
}

describe('fetchHatenaArticles', () => {
  beforeEach(async () => {
    await db.delete(articles)

    fetchMock.mockReset()
    parseStringMock.mockReset()

    fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<rss />'),
    })
  })

  afterAll(async () => {
    await db.delete(articles)
  })

  it('creatorが欠損した記事はauthorをフォールバック値で補完する', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        {
          title: '記事タイトル',
          content: '本文',
          link: 'https://example.com/1',
        },
      ],
    })

    const count = await fetchHatenaArticles(cronEnv)

    expect(count).toBe(1)
    expect(fetchMock).toHaveBeenCalledWith('https://b.hatena.ne.jp/hotentry/it.rss')
    const saved = await findByUrl('https://example.com/1')
    expect(saved.author).toBe('はてなブックマーク')
    expect(saved.description).toBe('本文')
    expect(saved.media).toBe('hatena')
  })

  it('D1互換のため記事は1件ずつ保存する', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        {
          title: '記事A',
          creator: '投稿者A',
          content: '本文A',
          link: 'https://example.com/a',
        },
        {
          title: '記事B',
          creator: '投稿者B',
          content: '本文B',
          link: 'https://example.com/b',
        },
      ],
    })

    const count = await fetchHatenaArticles(cronEnv)

    expect(count).toBe(2)
    expect(await countArticles()).toBe(2)
    expect((await findByUrl('https://example.com/a')).author).toBe('投稿者A')
    expect((await findByUrl('https://example.com/b')).author).toBe('投稿者B')
  })

  it('同一URLの重複記事は1件だけ保存する', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        {
          title: '記事A',
          creator: '投稿者A',
          content: '本文A',
          link: 'https://example.com/a',
        },
        {
          title: '記事A重複',
          creator: '投稿者A',
          content: '本文A重複',
          link: 'https://example.com/a',
        },
      ],
    })

    const count = await fetchHatenaArticles(cronEnv)

    expect(count).toBe(1)
    expect(await countArticles()).toBe(1)
  })

  it('既にDBへ保存済みのURLは一意制約により再保存されない', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        {
          title: '記事A',
          creator: '投稿者A',
          content: '本文A',
          link: 'https://example.com/a',
        },
      ],
    })

    const firstCount = await fetchHatenaArticles(cronEnv)
    expect(firstCount).toBe(1)
    expect(await countArticles()).toBe(1)

    const secondCount = await fetchHatenaArticles(cronEnv)
    expect(secondCount).toBe(0)
    expect(await countArticles()).toBe(1)
  })

  it('保存済みURLと新規URLが混在する場合は新規分のみ保存する', async () => {
    parseStringMock.mockResolvedValueOnce({
      items: [
        {
          title: '記事A',
          creator: '投稿者A',
          content: '本文A',
          link: 'https://example.com/a',
        },
      ],
    })
    await fetchHatenaArticles(cronEnv)

    parseStringMock.mockResolvedValueOnce({
      items: [
        {
          title: '記事A',
          creator: '投稿者A',
          content: '本文A',
          link: 'https://example.com/a',
        },
        {
          title: '記事B',
          creator: '投稿者B',
          content: '本文B',
          link: 'https://example.com/b',
        },
      ],
    })

    const count = await fetchHatenaArticles(cronEnv)

    expect(count).toBe(1)
    expect(await countArticles()).toBe(2)
    expect((await findByUrl('https://example.com/b')).author).toBe('投稿者B')
  })

  it('contentが欠損した記事は優先順位でdescriptionを補完する', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        {
          title: '記事1',
          creator: '投稿者1',
          'content:encoded': 'encoded本文',
          link: 'https://example.com/1',
        },
        {
          title: '記事2',
          creator: '投稿者2',
          contentSnippet: 'snippet本文',
          link: 'https://example.com/2',
        },
        {
          title: '記事3',
          creator: '投稿者3',
          link: 'https://example.com/3',
        },
      ],
    })

    const count = await fetchHatenaArticles(cronEnv)

    expect(count).toBe(3)
    expect((await findByUrl('https://example.com/1')).description).toBe('encoded本文')
    expect((await findByUrl('https://example.com/2')).description).toBe('snippet本文')
    expect((await findByUrl('https://example.com/3')).description).toBe('')
  })
})
