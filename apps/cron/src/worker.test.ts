import type { ExecutionContext, ScheduledController } from '@cloudflare/workers-types'
import { articles } from '@trend-diary/datastore/schema'
import { ARTICLE_MEDIA } from '@trend-diary/domain/article/media'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import TEST_ENV from './test-helper/env'
import {
  buildHatenaRdf,
  buildQiitaAtom,
  buildZennRss,
  FEED_URL,
  type FeedItem,
  rssResponse,
} from './test-helper/feed'
import { findByUrl, testRdb as db } from './test-helper/rdb'
import worker from './worker'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const QIITA_ITEMS: FeedItem[] = [
  {
    title: 'Qiita記事1',
    author: 'qiita_author1',
    content: 'Qiita本文1',
    url: 'https://qiita.com/u/items/q1',
  },
  {
    title: 'Qiita記事2',
    author: 'qiita_author2',
    content: 'Qiita本文2',
    url: 'https://qiita.com/u/items/q2',
  },
]
const ZENN_ITEMS: FeedItem[] = [
  {
    title: 'Zenn記事1',
    author: 'zenn_creator1',
    content: 'Zenn本文1',
    url: 'https://zenn.dev/u/articles/z1',
  },
]
const HATENA_ITEMS: FeedItem[] = [
  {
    title: 'はてな記事1',
    author: 'hatena_creator1',
    content: 'はてな本文1',
    url: 'https://example.com/hatena/h1',
  },
]
const TOTAL_ITEMS = QIITA_ITEMS.length + ZENN_ITEMS.length + HATENA_ITEMS.length

// fetch のモック応答は worker が参照する ok / status / text のみを備えれば十分なため、必要な最小形状で表す
interface FetchResponseMock {
  ok: boolean
  status: number
  text?: () => Promise<string>
}

function setupFetchRouting(overrides?: { hatena?: () => FetchResponseMock }): void {
  fetchMock.mockImplementation(async (input: string | URL) => {
    const target = String(input)
    if (target.startsWith(TEST_ENV.DISCORD_WEBHOOK_URL)) return { ok: true, status: 204 }
    if (target === FEED_URL.qiita) return rssResponse(buildQiitaAtom(QIITA_ITEMS))
    if (target === FEED_URL.zenn) return rssResponse(buildZennRss(ZENN_ITEMS))
    if (target === FEED_URL.hatena)
      return (overrides?.hatena ?? (() => rssResponse(buildHatenaRdf(HATENA_ITEMS))))()
    throw new Error(`unexpected fetch: ${target}`)
  })
}

async function runScheduled(scheduledTime: number): Promise<Promise<void>[]> {
  const waitUntilCalls: Promise<void>[] = []
  // Cloudflare の ScheduledController / ExecutionContext は多数のプロパティを持つ外部型のため、テストでは必要最小限のモックで代替する
  const event: Partial<ScheduledController> = { cron: '0 */1 * * *', scheduledTime }
  const context: Partial<ExecutionContext> = {
    waitUntil: (promise) => {
      waitUntilCalls.push(promise)
    },
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- 外部型のモックのため、必要なプロパティのみのオブジェクトをアサーションで渡す
  await worker.scheduled(event as ScheduledController, TEST_ENV, context as ExecutionContext)
  return waitUntilCalls
}

async function savedUrls(): Promise<string[]> {
  const rows = await db.select({ url: articles.url }).from(articles)
  return rows.map((row) => row.url)
}

function discordCallCount(): number {
  return fetchMock.mock.calls.filter((call) =>
    String(call[0]).startsWith(TEST_ENV.DISCORD_WEBHOOK_URL),
  ).length
}

describe('cron worker scheduled', () => {
  beforeEach(async () => {
    await db.delete(articles)
    fetchMock.mockReset()
    setupFetchRouting()
  })

  afterAll(async () => {
    await db.delete(articles)
    vi.unstubAllGlobals()
  })

  describe('正常系', () => {
    it('全メディアのRSSを取得し記事をD1へ保存する', async () => {
      await Promise.all(await runScheduled(1000))

      const urls = await savedUrls()
      expect(urls).toHaveLength(TOTAL_ITEMS)
      expect(urls).toEqual(
        expect.arrayContaining([
          'https://qiita.com/u/items/q1',
          'https://qiita.com/u/items/q2',
          'https://zenn.dev/u/articles/z1',
          'https://example.com/hatena/h1',
        ]),
      )
      expect((await findByUrl('https://qiita.com/u/items/q1')).media).toBe('qiita')
      expect((await findByUrl('https://zenn.dev/u/articles/z1')).author).toBe('zenn_creator1')
      expect((await findByUrl('https://example.com/hatena/h1')).description).toBe('はてな本文1')
      expect(discordCallCount()).toBe(0)
    })

    it('メディア別のRSSフェッチを直列ではなく並列で実行する', async () => {
      const feedXml: Record<string, string> = {
        [FEED_URL.qiita]: buildQiitaAtom(QIITA_ITEMS),
        [FEED_URL.zenn]: buildZennRss(ZENN_ITEMS),
        [FEED_URL.hatena]: buildHatenaRdf(HATENA_ITEMS),
      }
      let activeFetches = 0
      let peakConcurrency = 0
      fetchMock.mockImplementation(async (input: string | URL) => {
        const target = String(input)
        if (target.startsWith(TEST_ENV.DISCORD_WEBHOOK_URL)) return { ok: true, status: 204 }
        const xml = feedXml[target]
        if (xml === undefined) throw new Error(`unexpected fetch: ${target}`)
        activeFetches += 1
        peakConcurrency = Math.max(peakConcurrency, activeFetches)
        await new Promise((resolve) => setTimeout(resolve, 10))
        activeFetches -= 1
        return rssResponse(xml)
      })

      await Promise.all(await runScheduled(5000))

      expect(peakConcurrency).toBe(ARTICLE_MEDIA.length)
    })
  })

  describe('準正常系', () => {
    it('再実行しても既存URLはスキップされ記事は重複保存されない', async () => {
      await Promise.all(await runScheduled(2000))
      const firstCount = (await savedUrls()).length

      await Promise.all(await runScheduled(3000))
      const secondCount = (await savedUrls()).length

      expect(firstCount).toBe(TOTAL_ITEMS)
      expect(secondCount).toBe(TOTAL_ITEMS)
    })
  })

  describe('異常系', () => {
    it('一部メディアの取得が失敗しても残りを保存し、Discord通知のうえCloudflareへ失敗を伝播する', async () => {
      setupFetchRouting({ hatena: () => ({ ok: false, status: 500 }) })

      await expect(Promise.all(await runScheduled(4000))).rejects.toThrow()

      const urls = await savedUrls()
      expect(urls).toHaveLength(QIITA_ITEMS.length + ZENN_ITEMS.length)
      expect(urls).not.toContain('https://example.com/hatena/h1')
      expect(discordCallCount()).toBeGreaterThanOrEqual(1)
    })
  })
})
