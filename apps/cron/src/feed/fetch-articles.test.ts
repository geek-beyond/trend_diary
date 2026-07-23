import { articles } from '@trend-diary/datastore/schema'
import Logger from '@trend-diary/logger'
import { env } from 'cloudflare:test'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildHatenaRdf,
  buildQiitaAtom,
  buildZennRss,
  type FeedItem,
  rssResponse,
} from '../test-helper/feed'
import { countArticles, findByUrl, testRdb as db } from '../test-helper/rdb'
import { fetchHatenaArticles, fetchQiitaArticles, fetchZennArticles } from './fetch-articles'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const cronEnv = { DB: env.DB }
const logger = new Logger('silent')

// 記事ページ(og:image)の取得も同じ fetch を通るが、rssResponse の簡易オブジェクトは
// HTMLRewriter に渡せず抽出失敗扱い（ogImageUrl null）になるだけで、フィード取込の検証には影響しない
function stubFeed(xml: string): void {
  fetchMock.mockResolvedValue(rssResponse(xml))
}

function htmlResponse(html: string): Response {
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html' } })
}

// フィードURLにはXMLを、記事URLには対応するHTMLページを返し分ける
function stubFeedWithPages(xml: string, pagesByUrl: Record<string, string>): void {
  fetchMock.mockImplementation(async (input: string) => {
    const page = pagesByUrl[input]
    if (page !== undefined) return htmlResponse(page)
    return rssResponse(xml)
  })
}

function pageWithOgImage(ogImageUrl: string): string {
  return `<!DOCTYPE html><html><head><meta property="og:image" content="${ogImageUrl}" /></head><body>本文</body></html>`
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

      const result = await fetchQiitaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      const saved = await findByUrl('https://qiita.com/u/items/q1')
      expect(saved.media).toBe('qiita')
      expect(saved.title).toBe('Qiita記事')
      expect(saved.author).toBe('qiita_author')
      expect(saved.description).toBe('Qiita本文')
    })

    it('新規記事の記事ページから og:image を取得し ogImageUrl として保存する', async () => {
      stubFeedWithPages(
        buildQiitaAtom([
          {
            title: 'Qiita記事',
            author: 'qiita_author',
            content: 'Qiita本文',
            url: 'https://qiita.com/u/items/q1',
          },
        ]),
        { 'https://qiita.com/u/items/q1': pageWithOgImage('https://cdn.qiita.com/og/q1.png') },
      )

      const result = await fetchQiitaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      expect((await findByUrl('https://qiita.com/u/items/q1')).ogImageUrl).toBe(
        'https://cdn.qiita.com/og/q1.png',
      )
    })

    it('記事ページに og:image が無い場合は ogImageUrl を null のまま保存する', async () => {
      stubFeedWithPages(
        buildQiitaAtom([
          {
            title: 'Qiita記事',
            author: 'qiita_author',
            content: 'Qiita本文',
            url: 'https://qiita.com/u/items/q1',
          },
        ]),
        {
          'https://qiita.com/u/items/q1': '<!DOCTYPE html><html><head></head><body></body></html>',
        },
      )

      const result = await fetchQiitaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      expect((await findByUrl('https://qiita.com/u/items/q1')).ogImageUrl).toBeNull()
    })

    it('content が欠損した記事は description を空文字で補完して保存する', async () => {
      stubFeed(
        buildQiitaAtom([
          {
            title: 'Qiita記事',
            author: 'qiita_author',
            url: 'https://qiita.com/u/items/no-content',
          },
        ]),
      )

      const result = await fetchQiitaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      expect((await findByUrl('https://qiita.com/u/items/no-content')).description).toBe('')
    })
  })

  describe('準正常系', () => {
    const skipCases: { name: string; item: FeedItem }[] = [
      {
        name: 'title が欠損した記事',
        item: { author: 'qiita_author', content: '本文', url: 'https://qiita.com/u/items/skip' },
      },
      {
        name: 'author が欠損した記事',
        item: { title: 'Qiita記事', content: '本文', url: 'https://qiita.com/u/items/skip' },
      },
      {
        name: 'url が欠損した記事',
        item: { title: 'Qiita記事', author: 'qiita_author', content: '本文' },
      },
    ]

    it.each(skipCases)('$name はスキップして保存しない', async ({ item }) => {
      stubFeed(buildQiitaAtom([item]))

      const result = await fetchQiitaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(0)
      expect(await countArticles()).toBe(0)
    })

    it('不正な記事を除外し正常な記事のみ保存する（部分成功）', async () => {
      stubFeed(
        buildQiitaAtom([
          { author: 'qiita_author', content: '本文', url: 'https://qiita.com/u/items/skip' },
          {
            title: 'Qiita正常',
            author: 'qiita_author',
            content: '本文',
            url: 'https://qiita.com/u/items/ok',
          },
        ]),
      )

      const result = await fetchQiitaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      expect(await countArticles()).toBe(1)
      expect((await findByUrl('https://qiita.com/u/items/ok')).title).toBe('Qiita正常')
    })

    it('スキップした件数を警告ログに出力する', async () => {
      const spyLogger = new Logger('silent')
      const warnSpy = vi.spyOn(spyLogger, 'warn')
      stubFeed(
        buildQiitaAtom([
          { author: 'qiita_author', content: '本文', url: 'https://qiita.com/u/items/skip1' },
          { author: 'qiita_author', content: '本文', url: 'https://qiita.com/u/items/skip2' },
        ]),
      )

      await fetchQiitaArticles(cronEnv, spyLogger)

      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'cron feed items skipped',
          media: 'qiita',
          skippedCount: 2,
        }),
      )
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

      const result = await fetchZennArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      const saved = await findByUrl('https://zenn.dev/u/articles/z1')
      expect(saved.media).toBe('zenn')
      expect(saved.author).toBe('zenn_creator')
      expect(saved.description).toBe('Zenn本文')
    })
  })

  describe('準正常系', () => {
    const skipCases: { name: string; item: FeedItem }[] = [
      {
        name: 'title が欠損した記事',
        item: { author: 'zenn_creator', content: '本文', url: 'https://zenn.dev/u/articles/skip' },
      },
      {
        name: 'creator が欠損した記事',
        item: { title: 'Zenn記事', content: '本文', url: 'https://zenn.dev/u/articles/skip' },
      },
      {
        name: 'link が欠損した記事',
        item: { title: 'Zenn記事', author: 'zenn_creator', content: '本文' },
      },
    ]

    it.each(skipCases)('$name はスキップして保存しない', async ({ item }) => {
      stubFeed(buildZennRss([item]))

      const result = await fetchZennArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(0)
      expect(await countArticles()).toBe(0)
    })

    it('不正な記事を除外し正常な記事のみ保存する（部分成功）', async () => {
      stubFeed(
        buildZennRss([
          { author: 'zenn_creator', content: '本文', url: 'https://zenn.dev/u/articles/skip' },
          {
            title: 'Zenn正常',
            author: 'zenn_creator',
            content: '本文',
            url: 'https://zenn.dev/u/articles/ok',
          },
        ]),
      )

      const result = await fetchZennArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      expect(await countArticles()).toBe(1)
      expect((await findByUrl('https://zenn.dev/u/articles/ok')).title).toBe('Zenn正常')
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

      const result = await fetchHatenaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      const saved = await findByUrl('https://example.com/h1')
      expect(saved.media).toBe('hatena')
      expect(saved.author).toBe('hatena_creator')
      expect(saved.description).toBe('はてな本文')
    })

    it('記事ページの取得に失敗しても記事自体は ogImageUrl を null のまま保存する', async () => {
      const xml = buildHatenaRdf([
        {
          title: 'はてな記事',
          author: 'hatena_creator',
          content: 'はてな本文',
          url: 'https://example.com/h1',
        },
      ])
      fetchMock.mockImplementation(async (input: string) => {
        if (input === 'https://example.com/h1') throw new Error('page fetch error')
        return rssResponse(xml)
      })

      const result = await fetchHatenaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(1)
      expect((await findByUrl('https://example.com/h1')).ogImageUrl).toBeNull()
    })

    it('新規記事を全件保存する', async () => {
      stubHatena([
        { title: '記事A', author: '投稿者A', content: '本文A', url: 'https://example.com/a' },
        { title: '記事B', author: '投稿者B', content: '本文B', url: 'https://example.com/b' },
      ])

      const result = await fetchHatenaArticles(cronEnv, logger)

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

      const result = await fetchHatenaArticles(cronEnv, logger)

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

      const result = await fetchHatenaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(expected)
      expect(await countArticles()).toBe(expected)
    })

    it('チャンク上限を超える記事もすべて保存する', async () => {
      const items: FeedItem[] = Array.from({ length: 40 }, (_, i) => ({
        title: `記事${i}`,
        author: `投稿者${i}`,
        content: `本文${i}`,
        url: `https://example.com/chunk/${i}`,
      }))
      stubHatena(items)

      const result = await fetchHatenaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) expect(result.value).toBe(40)
      expect(await countArticles()).toBe(40)
    })

    it('creator が欠損した記事は author をはてなブックマークで補完する', async () => {
      stubHatena([{ title: 'はてな記事', content: 'はてな本文', url: 'https://example.com/h1' }])

      const result = await fetchHatenaArticles(cronEnv, logger)

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

      const result = await fetchHatenaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      const saved = await findByUrl('https://example.com/long')
      expect([...saved.title].length).toBe(100)
      expect([...saved.author].length).toBe(30)
      expect([...saved.description].length).toBe(1024)
    })

    // URL は切り詰めると壊れるため長さで加工しない（現実的に上限を超えない前提でそのまま保存する）
    it('長い URL も切り詰めずそのまま保存する', async () => {
      const baseUrl = 'https://example.com/'
      const longUrl = baseUrl + 'a'.repeat(2100 - baseUrl.length)
      stubHatena([{ title: '記事', content: '本文', url: longUrl }])

      const result = await fetchHatenaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      const saved = await findByUrl(longUrl)
      expect(saved.url).toBe(longUrl)
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

      const result = await fetchHatenaArticles(cronEnv, logger)

      expect(result.isOk()).toBe(true)
      const saved = await findByUrl('https://example.com/emoji')
      expect(saved.author).toBe('😀'.repeat(30))
      expect(saved.author).not.toContain('�')
    })

    it('既にDBへ保存済みのURLはスキップし新規分のみ保存する', async () => {
      stubHatena([
        { title: '記事A', author: '投稿者A', content: '本文A', url: 'https://example.com/a' },
      ])
      const firstResult = await fetchHatenaArticles(cronEnv, logger)
      expect(firstResult.isOk()).toBe(true)

      stubHatena([
        { title: '記事A', author: '投稿者A', content: '本文A', url: 'https://example.com/a' },
        { title: '記事B', author: '投稿者B', content: '本文B', url: 'https://example.com/b' },
      ])
      const secondResult = await fetchHatenaArticles(cronEnv, logger)

      expect(secondResult.isOk()).toBe(true)
      if (secondResult.isOk()) expect(secondResult.value).toBe(1)
      expect(await countArticles()).toBe(2)
      expect((await findByUrl('https://example.com/b')).author).toBe('投稿者B')
    })
  })

  describe('異常系', () => {
    it('fetch にタイムアウト用の AbortSignal を渡す', async () => {
      stubHatena([
        {
          title: 'はてな記事',
          author: 'hatena_creator',
          content: '本文',
          url: 'https://example.com/h1',
        },
      ])

      await fetchHatenaArticles(cronEnv, logger)

      const [, options] = fetchMock.mock.calls[0] ?? []
      expect(options?.signal).toBeInstanceOf(AbortSignal)
    })

    it('一時的な取得失敗はリトライし、回復後は成功する', async () => {
      vi.useFakeTimers()
      fetchMock
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(rssResponse(buildHatenaRdf([])))

      const promise = fetchHatenaArticles(cronEnv, logger)
      await vi.runAllTimersAsync()
      const result = await promise
      vi.useRealTimers()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.isOk()).toBe(true)
    })

    it('全試行が失敗した場合は最大3回試行し err を返し何も保存しない', async () => {
      vi.useFakeTimers()
      fetchMock.mockRejectedValue(new Error('network error'))

      const promise = fetchHatenaArticles(cronEnv, logger)
      await vi.runAllTimersAsync()
      const result = await promise
      vi.useRealTimers()

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(result.isErr()).toBe(true)
      if (result.isErr()) expect(result.error).toBeInstanceOf(Error)
      expect(await countArticles()).toBe(0)
    })

    it('レスポンスが ok でない場合もリトライ対象とし、最終的に err を返す', async () => {
      vi.useFakeTimers()
      // 実 Response の契約（headers・text が必ず存在する）に合わせたモックにする
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        text: async () => '',
      })

      const promise = fetchHatenaArticles(cronEnv, logger)
      await vi.runAllTimersAsync()
      const result = await promise
      vi.useRealTimers()

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(result.isErr()).toBe(true)
      if (result.isErr()) expect(result.error.message).toContain('status=500')
      expect(await countArticles()).toBe(0)
    })
  })
})
