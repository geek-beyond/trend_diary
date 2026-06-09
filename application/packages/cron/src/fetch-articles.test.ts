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
import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import { fetchHatenaArticles } from './fetch-articles'
import { testRdb as db } from './test-helper/rdb'

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

    const result = await fetchHatenaArticles(cronEnv)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe(1)
    }
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

    const result = await fetchHatenaArticles(cronEnv)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe(2)
    }
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

    const result = await fetchHatenaArticles(cronEnv)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe(1)
    }
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

    const firstResult = await fetchHatenaArticles(cronEnv)
    expect(firstResult.isOk()).toBe(true)
    if (firstResult.isOk()) {
      expect(firstResult.value).toBe(1)
    }
    expect(await countArticles()).toBe(1)

    const secondResult = await fetchHatenaArticles(cronEnv)
    expect(secondResult.isOk()).toBe(true)
    if (secondResult.isOk()) {
      expect(secondResult.value).toBe(0)
    }
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

    const result = await fetchHatenaArticles(cronEnv)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe(1)
    }
    expect(await countArticles()).toBe(2)
    expect((await findByUrl('https://example.com/b')).author).toBe('投稿者B')
  })

  it('RSS取得に失敗した場合はerrを返す', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    })

    const result = await fetchHatenaArticles(cronEnv)

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(Error)
    }
    expect(await countArticles()).toBe(0)
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

    const result = await fetchHatenaArticles(cronEnv)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe(3)
    }
    expect((await findByUrl('https://example.com/1')).description).toBe('encoded本文')
    expect((await findByUrl('https://example.com/2')).description).toBe('snippet本文')
    expect((await findByUrl('https://example.com/3')).description).toBe('')
  })
})
