import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.hoisted(() => vi.fn())
const parseStringMock = vi.hoisted(() => vi.fn())

vi.stubGlobal('fetch', fetchMock)

// rss-parser はモックし、パース結果（item オブジェクト）を直接注入する。
// 実XMLのパースは worker.test.ts（e2e）が実 rss-parser で担保する。
vi.mock('rss-parser', () => ({
  default: class MockParser {
    parseString(xml: string) {
      return parseStringMock(xml)
    }
  },
}))

import { env } from 'cloudflare:test'
import { fetchHatenaArticles, fetchQiitaArticles, fetchZennArticles } from './fetch-articles'
import { testRdb as db } from './test-helper/rdb'

const cronEnv = { DB: env.DB }

const QIITA_FEED_URL = 'https://qiita.com/popular-items/feed.atom'
const ZENN_FEED_URL = 'https://zenn.dev/feed'
const HATENA_FEED_URL = 'https://b.hatena.ne.jp/hotentry/it.rss'

async function countArticles(): Promise<number> {
  const rows = await db.select({ url: articles.url }).from(articles)
  return rows.length
}

async function findByUrl(url: string) {
  const [row] = await db.select().from(articles).where(eq(articles.url, url)).limit(1)
  return row
}

// rss-parser のパース結果を1回分注入する。
function mockParsedItems(items: unknown[]): void {
  parseStringMock.mockResolvedValue({ items })
}

describe('記事取得（公開API越し結合テスト）', () => {
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

  describe('メディア別マッピング', () => {
    it('fetchQiitaArticles: author/content/link を記事へマッピングする', async () => {
      mockParsedItems([
        {
          title: 'Qiita記事',
          author: 'qiita_author',
          content: 'Qiita本文',
          link: 'https://qiita.com/u/items/q1',
        },
      ])

      const result = await fetchQiitaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      expect(fetchMock).toHaveBeenCalledWith(QIITA_FEED_URL)
      const saved = await findByUrl('https://qiita.com/u/items/q1')
      expect(saved.media).toBe('qiita')
      expect(saved.title).toBe('Qiita記事')
      expect(saved.author).toBe('qiita_author')
      expect(saved.description).toBe('Qiita本文')
    })

    it('fetchZennArticles: creator を author、content を description へマッピングする', async () => {
      mockParsedItems([
        {
          title: 'Zenn記事',
          creator: 'zenn_creator',
          content: 'Zenn本文',
          link: 'https://zenn.dev/u/articles/z1',
        },
      ])

      const result = await fetchZennArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      expect(fetchMock).toHaveBeenCalledWith(ZENN_FEED_URL)
      const saved = await findByUrl('https://zenn.dev/u/articles/z1')
      expect(saved.media).toBe('zenn')
      expect(saved.author).toBe('zenn_creator')
      expect(saved.description).toBe('Zenn本文')
    })

    it('fetchHatenaArticles: creator を author、content を description へマッピングする', async () => {
      mockParsedItems([
        {
          title: 'はてな記事',
          creator: 'hatena_creator',
          content: 'はてな本文',
          link: 'https://example.com/h1',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      expect(fetchMock).toHaveBeenCalledWith(HATENA_FEED_URL)
      const saved = await findByUrl('https://example.com/h1')
      expect(saved.media).toBe('hatena')
      expect(saved.author).toBe('hatena_creator')
      expect(saved.description).toBe('はてな本文')
    })
  })

  describe('hatena のフォールバック補完', () => {
    it('creator が欠損した記事は author をはてなブックマークで補完する', async () => {
      mockParsedItems([
        {
          title: 'はてな記事',
          content: 'はてな本文',
          link: 'https://example.com/h1',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      const saved = await findByUrl('https://example.com/h1')
      expect(saved.author).toBe('はてなブックマーク')
    })

    it('description は content > content:encoded > contentSnippet の優先順位で補完する', async () => {
      mockParsedItems([
        {
          title: '記事1',
          creator: '投稿者1',
          content: 'content本文',
          'content:encoded': 'encoded本文',
          contentSnippet: 'snippet本文',
          link: 'https://example.com/1',
        },
        {
          title: '記事2',
          creator: '投稿者2',
          'content:encoded': 'encoded本文',
          contentSnippet: 'snippet本文',
          link: 'https://example.com/2',
        },
        {
          title: '記事3',
          creator: '投稿者3',
          contentSnippet: 'snippet本文',
          link: 'https://example.com/3',
        },
        {
          title: '記事4',
          creator: '投稿者4',
          link: 'https://example.com/4',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(4)
      expect((await findByUrl('https://example.com/1')).description).toBe('content本文')
      expect((await findByUrl('https://example.com/2')).description).toBe('encoded本文')
      expect((await findByUrl('https://example.com/3')).description).toBe('snippet本文')
      expect((await findByUrl('https://example.com/4')).description).toBe('')
    })
  })

  describe('正規化（truncate）', () => {
    it('各フィールドを最大長で切り詰める', async () => {
      mockParsedItems([
        {
          title: 'あ'.repeat(150),
          creator: 'い'.repeat(40),
          content: 'う'.repeat(1100),
          link: 'https://example.com/long',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      const saved = await findByUrl('https://example.com/long')
      expect([...saved.title].length).toBe(100)
      expect([...saved.author].length).toBe(30)
      expect([...saved.description].length).toBe(1024)
    })

    it('コードポイント単位で切り詰めサロゲートペア（絵文字）を壊さない', async () => {
      mockParsedItems([
        {
          title: '記事',
          creator: '😀'.repeat(40),
          content: '本文',
          link: 'https://example.com/emoji',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      const saved = await findByUrl('https://example.com/emoji')
      // 30コードポイント＝絵文字30個。UTF-16長は60だが文字化け（U+FFFD）しない。
      expect([...saved.author].length).toBe(30)
      expect(saved.author).toBe('😀'.repeat(30))
      expect(saved.author).not.toContain('�')
    })

    it('description は 255 超〜1024 文字まで保存される（domain schema との不整合は別タスクで対応）', async () => {
      mockParsedItems([
        {
          title: '記事',
          creator: '投稿者',
          content: 'え'.repeat(600),
          link: 'https://example.com/desc',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      const saved = await findByUrl('https://example.com/desc')
      expect([...saved.description].length).toBe(600)
    })
  })

  describe('永続化挙動', () => {
    it('空フィードは ok(0) を返し何も保存しない', async () => {
      mockParsedItems([])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(0)
      expect(await countArticles()).toBe(0)
    })

    it('新規記事は全件保存される（D1互換のため1件ずつ）', async () => {
      mockParsedItems([
        { title: '記事A', creator: '投稿者A', content: '本文A', link: 'https://example.com/a' },
        { title: '記事B', creator: '投稿者B', content: '本文B', link: 'https://example.com/b' },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(2)
      expect(await countArticles()).toBe(2)
    })

    it('フィード内で同一URLが重複する場合は1件だけ保存する', async () => {
      mockParsedItems([
        { title: '記事A', creator: '投稿者A', content: '本文A', link: 'https://example.com/a' },
        {
          title: '記事A重複',
          creator: '投稿者A',
          content: '本文A重複',
          link: 'https://example.com/a',
        },
      ])

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      expect(await countArticles()).toBe(1)
    })

    it('既にDBへ保存済みのURLはスキップし、新規分のみ保存する', async () => {
      mockParsedItems([
        { title: '記事A', creator: '投稿者A', content: '本文A', link: 'https://example.com/a' },
      ])
      const firstResult = await fetchHatenaArticles(cronEnv)
      expect(firstResult.isOk()).toBe(true)
      if (firstResult.isOk()) expect(firstResult.value).toBe(1)

      mockParsedItems([
        { title: '記事A', creator: '投稿者A', content: '本文A', link: 'https://example.com/a' },
        { title: '記事B', creator: '投稿者B', content: '本文B', link: 'https://example.com/b' },
      ])
      const secondResult = await fetchHatenaArticles(cronEnv)

      expect(secondResult.isOk()).toBe(true)
      if (secondResult.isOk()) expect(secondResult.value).toBe(1)
      expect(await countArticles()).toBe(2)
      expect((await findByUrl('https://example.com/b')).author).toBe('投稿者B')
    })

    it('RSS取得に失敗した場合は err を返し何も保存しない', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 })

      const result = await fetchHatenaArticles(cronEnv)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) expect(result.error).toBeInstanceOf(Error)
      expect(await countArticles()).toBe(0)
    })
  })
})
