import { env } from 'cloudflare:test'
import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHatenaArticles, fetchQiitaArticles, fetchZennArticles } from './fetch-articles'
import {
  buildHatenaRdf,
  buildQiitaAtom,
  buildZennRss,
  type FeedItem,
  rssResponse,
} from './test-helper/feed'
import { testRdb as db } from './test-helper/rdb'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const cronEnv = { DB: env.DB }

function stubFeed(xml: string): void {
  fetchMock.mockResolvedValue(rssResponse(xml))
}

async function countArticles(): Promise<number> {
  const rows = await db.select({ url: articles.url }).from(articles)
  return rows.length
}

async function findByUrl(url: string) {
  const [row] = await db.select().from(articles).where(eq(articles.url, url)).limit(1)
  return row
}

beforeEach(async () => {
  await db.delete(articles)
  fetchMock.mockReset()
})

afterAll(async () => {
  await db.delete(articles)
  vi.unstubAllGlobals()
})

describe('fetchQiitaArticles', () => {
  describe('正常系', () => {
    it('author を author、content を description にマッピングして保存する', async () => {
      stubFeed(
        buildQiitaAtom([
          {
            title: 'Qiita記事',
            author: 'qiita_author',
            content: 'Qiita本文',
            url: 'https://qiita.com/u/items/q1',
          },
        ]),
      )

      const result = await fetchQiitaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      const saved = await findByUrl('https://qiita.com/u/items/q1')
      expect(saved.media).toBe('qiita')
      expect(saved.title).toBe('Qiita記事')
      expect(saved.author).toBe('qiita_author')
      expect(saved.description).toBe('Qiita本文')
    })
  })
})

describe('fetchZennArticles', () => {
  describe('正常系', () => {
    it('creator を author、content を description にマッピングして保存する', async () => {
      stubFeed(
        buildZennRss([
          {
            title: 'Zenn記事',
            author: 'zenn_creator',
            content: 'Zenn本文',
            url: 'https://zenn.dev/u/articles/z1',
          },
        ]),
      )

      const result = await fetchZennArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      const saved = await findByUrl('https://zenn.dev/u/articles/z1')
      expect(saved.media).toBe('zenn')
      expect(saved.author).toBe('zenn_creator')
      expect(saved.description).toBe('Zenn本文')
    })
  })
})

describe('fetchHatenaArticles', () => {
  function stubHatena(items: FeedItem[]): void {
    stubFeed(buildHatenaRdf(items))
  }

  describe('正常系', () => {
    it('creator を author、content を description にマッピングして保存する', async () => {
      stubHatena([
        {
          title: 'はてな記事',
          author: 'hatena_creator',
          content: 'はてな本文',
          url: 'https://example.com/h1',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      const saved = await findByUrl('https://example.com/h1')
      expect(saved.media).toBe('hatena')
      expect(saved.author).toBe('hatena_creator')
      expect(saved.description).toBe('はてな本文')
    })

    it('新規記事を全件保存する', async () => {
      stubHatena([
        { title: '記事A', author: '投稿者A', content: '本文A', url: 'https://example.com/a' },
        { title: '記事B', author: '投稿者B', content: '本文B', url: 'https://example.com/b' },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(2)
      expect(await countArticles()).toBe(2)
    })
  })

  describe('準正常系', () => {
    const descriptionCases: { name: string; overrides: Partial<FeedItem>; expected: string }[] = [
      {
        name: 'content を content:encoded より優先する',
        overrides: { content: 'content本文', contentEncoded: 'encoded本文' },
        expected: 'content本文',
      },
      {
        name: 'content 欠損時は content:encoded で補完する',
        overrides: { contentEncoded: 'encoded本文' },
        expected: 'encoded本文',
      },
      {
        name: 'content 系がすべて欠損なら空にする',
        overrides: {},
        expected: '',
      },
    ]

    it.each(descriptionCases)('description は $name', async ({ overrides, expected }) => {
      const url = 'https://example.com/description'
      stubHatena([{ title: '記事', author: '投稿者', url, ...overrides }])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      expect((await findByUrl(url)).description).toBe(expected)
    })

    const saveCountCases: { name: string; items: FeedItem[]; expected: number }[] = [
      {
        name: 'フィード内で同一URLが重複する場合は1件だけ保存する',
        items: [
          { title: '記事A', author: '投稿者A', content: '本文A', url: 'https://example.com/a' },
          {
            title: '記事A重複',
            author: '投稿者A',
            content: '本文A重複',
            url: 'https://example.com/a',
          },
        ],
        expected: 1,
      },
      {
        name: '空フィードは何も保存しない',
        items: [],
        expected: 0,
      },
    ]

    it.each(saveCountCases)('$name', async ({ items, expected }) => {
      stubHatena(items)

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(expected)
      expect(await countArticles()).toBe(expected)
    })

    it('creator が欠損した記事は author をはてなブックマークで補完する', async () => {
      stubHatena([{ title: 'はてな記事', content: 'はてな本文', url: 'https://example.com/h1' }])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      expect((await findByUrl('https://example.com/h1')).author).toBe('はてなブックマーク')
    })

    it('各フィールドを最大長で切り詰める', async () => {
      stubHatena([
        {
          title: 'あ'.repeat(150),
          author: 'い'.repeat(40),
          content: 'う'.repeat(1100),
          url: 'https://example.com/long',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      const saved = await findByUrl('https://example.com/long')
      expect([...saved.title].length).toBe(100)
      expect([...saved.author].length).toBe(30)
      // description は domain schema(255) と不整合だが現状は 1024 まで保存される（別タスクで対応）
      expect([...saved.description].length).toBe(1024)
    })

    it('絵文字をコードポイント単位で切り詰めサロゲートペアを壊さない', async () => {
      stubHatena([
        {
          title: '記事',
          author: '😀'.repeat(40),
          content: '本文',
          url: 'https://example.com/emoji',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      const saved = await findByUrl('https://example.com/emoji')
      expect(saved.author).toBe('😀'.repeat(30))
      expect(saved.author).not.toContain('�')
    })

    it('既にDBへ保存済みのURLはスキップし新規分のみ保存する', async () => {
      stubHatena([
        { title: '記事A', author: '投稿者A', content: '本文A', url: 'https://example.com/a' },
      ])
      const firstResult = await fetchHatenaArticles(cronEnv)
      expect(firstResult.isOk()).toBe(true)

      stubHatena([
        { title: '記事A', author: '投稿者A', content: '本文A', url: 'https://example.com/a' },
        { title: '記事B', author: '投稿者B', content: '本文B', url: 'https://example.com/b' },
      ])
      const secondResult = await fetchHatenaArticles(cronEnv)

      expect(secondResult.isOk()).toBe(true)
      if (secondResult.isOk()) expect(secondResult.value).toBe(1)
      expect(await countArticles()).toBe(2)
      expect((await findByUrl('https://example.com/b')).author).toBe('投稿者B')
    })
  })

  describe('異常系', () => {
    it('RSS取得に失敗した場合は err を返し何も保存しない', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 })

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) expect(result.error).toBeInstanceOf(Error)
      expect(await countArticles()).toBe(0)
    })
  })
})
