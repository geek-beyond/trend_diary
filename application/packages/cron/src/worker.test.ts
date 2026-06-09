import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// e2e: worker.scheduled を実 D1・実 rss-parser で貫通させ、
// 外部境界（RSSフィード取得 / Discord通知）のみ global fetch でスタブする。
const fetchMock = vi.hoisted(() => vi.fn())

vi.stubGlobal('fetch', fetchMock)

import { env } from 'cloudflare:test'
import { testRdb as db } from './test-helper/rdb'
import worker from './worker'

const QIITA_FEED_URL = 'https://qiita.com/popular-items/feed.atom'
const ZENN_FEED_URL = 'https://zenn.dev/feed'
const HATENA_FEED_URL = 'https://b.hatena.ne.jp/hotentry/it.rss'
const DISCORD_WEBHOOK_URL = 'https://discord.test/webhook'

type FeedArticle = { title: string; author: string; content: string; url: string }

function buildQiitaAtom(items: FeedArticle[]): string {
  const entries = items
    .map(
      (item) => `  <entry>
    <title>${item.title}</title>
    <link href="${item.url}"/>
    <author><name>${item.author}</name></author>
    <content type="html">${item.content}</content>
  </entry>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
${entries}
</feed>`
}

function buildZennRss(items: FeedArticle[]): string {
  const entries = items
    .map(
      (item) => `    <item>
      <title>${item.title}</title>
      <link>${item.url}</link>
      <description>${item.content}</description>
      <dc:creator>${item.author}</dc:creator>
    </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
${entries}
  </channel>
</rss>`
}

function buildHatenaRdf(items: FeedArticle[]): string {
  const lis = items.map((item) => `<rdf:li rdf:resource="${item.url}"/>`).join('')
  const entries = items
    .map(
      (item) => `  <item rdf:about="${item.url}">
    <title>${item.title}</title>
    <link>${item.url}</link>
    <description>${item.content}</description>
    <dc:creator>${item.author}</dc:creator>
  </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="${HATENA_FEED_URL}">
    <title>はてブIT</title>
    <link>https://b.hatena.ne.jp/hotentry/it</link>
    <items><rdf:Seq>${lis}</rdf:Seq></items>
  </channel>
${entries}
</rdf:RDF>`
}

function rssResponse(xml: string) {
  return { ok: true, status: 200, text: async () => xml }
}

const QIITA_ITEMS: FeedArticle[] = [
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
const ZENN_ITEMS: FeedArticle[] = [
  {
    title: 'Zenn記事1',
    author: 'zenn_creator1',
    content: 'Zenn本文1',
    url: 'https://zenn.dev/u/articles/z1',
  },
]
const HATENA_ITEMS: FeedArticle[] = [
  {
    title: 'はてな記事1',
    author: 'hatena_creator1',
    content: 'はてな本文1',
    url: 'https://example.com/hatena/h1',
  },
]

// 各メディアのフィードを返す既定ルーティング。media ごとに上書き可能。
function setupFetchRouting(overrides?: {
  qiita?: () => unknown
  zenn?: () => unknown
  hatena?: () => unknown
}): void {
  fetchMock.mockImplementation(async (url: string) => {
    const target = String(url)
    if (target.startsWith(DISCORD_WEBHOOK_URL)) return { ok: true, status: 204 }
    if (target === QIITA_FEED_URL)
      return (overrides?.qiita ?? (() => rssResponse(buildQiitaAtom(QIITA_ITEMS))))()
    if (target === ZENN_FEED_URL)
      return (overrides?.zenn ?? (() => rssResponse(buildZennRss(ZENN_ITEMS))))()
    if (target === HATENA_FEED_URL)
      return (overrides?.hatena ?? (() => rssResponse(buildHatenaRdf(HATENA_ITEMS))))()
    throw new Error(`unexpected fetch: ${target}`)
  })
}

function buildEnv() {
  return {
    DB: env.DB,
    DISCORD_WEBHOOK_URL,
    LOG_LEVEL: 'silent' as const,
  }
}

// worker.scheduled を実行し、waitUntil に登録された Promise を回収する。
async function runScheduled(cron: string, scheduledTime: number): Promise<Promise<unknown>[]> {
  const waitUntilCalls: Promise<unknown>[] = []
  const event = { cron, scheduledTime } as ScheduledController
  await worker.scheduled(event, buildEnv(), {
    waitUntil: (promise: Promise<unknown>) => {
      waitUntilCalls.push(promise)
    },
  } as ExecutionContext)
  return waitUntilCalls
}

async function fetchedUrls(): Promise<string[]> {
  const rows = await db.select({ url: articles.url }).from(articles)
  return rows.map((row) => row.url)
}

async function findByUrl(url: string) {
  const [row] = await db.select().from(articles).where(eq(articles.url, url)).limit(1)
  return row
}

function discordCallCount(): number {
  return fetchMock.mock.calls.filter((call) => String(call[0]).startsWith(DISCORD_WEBHOOK_URL))
    .length
}

describe('cron worker（e2e: 実D1貫通）', () => {
  beforeEach(async () => {
    await db.delete(articles)
    fetchMock.mockReset()
    setupFetchRouting()
  })

  afterAll(async () => {
    await db.delete(articles)
  })

  it('全メディアのRSSを取得し、記事をD1へ保存する', async () => {
    const waitUntilCalls = await runScheduled('0 */1 * * *', 1000)

    expect(waitUntilCalls).toHaveLength(1)
    await Promise.all(waitUntilCalls)

    const urls = await fetchedUrls()
    expect(urls).toHaveLength(QIITA_ITEMS.length + ZENN_ITEMS.length + HATENA_ITEMS.length)
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

    // 全件成功時は Discord 通知されない。
    expect(discordCallCount()).toBe(0)
  })

  it('一部メディアの取得が失敗しても残りは保存し、Discord通知のうえCloudflareへ失敗を伝播する', async () => {
    setupFetchRouting({ hatena: () => ({ ok: false, status: 500 }) })

    const waitUntilCalls = await runScheduled('0 */1 * * *', 2000)

    expect(waitUntilCalls).toHaveLength(1)
    await expect(Promise.all(waitUntilCalls)).rejects.toThrow()

    // qiita / zenn は保存される。
    const urls = await fetchedUrls()
    expect(urls).toHaveLength(QIITA_ITEMS.length + ZENN_ITEMS.length)
    expect(urls).not.toContain('https://example.com/hatena/h1')

    // 失敗メディア通知 + ジョブ失敗通知で Discord が呼ばれる。
    expect(discordCallCount()).toBeGreaterThanOrEqual(1)
  })

  it('再実行しても既存URLはスキップされ、記事は重複保存されない（冪等性）', async () => {
    await Promise.all(await runScheduled('0 */1 * * *', 3000))
    const firstCount = (await fetchedUrls()).length

    await Promise.all(await runScheduled('0 */1 * * *', 4000))
    const secondCount = (await fetchedUrls()).length

    expect(secondCount).toBe(firstCount)
    expect(secondCount).toBe(QIITA_ITEMS.length + ZENN_ITEMS.length + HATENA_ITEMS.length)
  })
})

type ScheduledController = import('@cloudflare/workers-types').ScheduledController
type ExecutionContext = import('@cloudflare/workers-types').ExecutionContext
