import { LibsqlError } from '@libsql/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@/infrastructure/rdb', () => import('@/test/__mocks__/rdb'))

import { fetchHatenaArticles } from '@/cron/fetch-articles'
import { closeRdbClient } from '@/infrastructure/rdb'
import { mockRdbExecutor } from '@/test/__mocks__/rdb'

// INFO: sqlite-proxy のモックは「カラム順の配列」で行を返す。
// storeArticles は select({ url: articles.url }) と insert(articles).values(...) を実行するため、
// SQLが select か insert かでモックの戻り行とinsert呼び出し回数を制御する。
type ProxyMethod = 'run' | 'all' | 'values' | 'get'

function setupExecutor(options: { existingUrls?: string[] } = {}) {
  const existingUrls = options.existingUrls ?? []
  mockRdbExecutor.mockImplementation(
    async (sql: string, _params: unknown[], _method: ProxyMethod) => {
      if (/^\s*select/i.test(sql)) {
        // INFO: select({ url: articles.url }) はカラム順の配列（url のみ）で返す
        return { rows: existingUrls.map((url) => [url]) }
      }
      // INFO: insert(articles).values(...) は returning なしのため行は不要
      return { rows: [] }
    },
  )
}

function getInsertCalls() {
  return mockRdbExecutor.mock.calls.filter(([sql]) => /^\s*insert/i.test(sql as string))
}

describe('fetchHatenaArticles', () => {
  const env = {
    DB: {} as D1Database,
    DATABASE_URL: 'file:./test.db',
  }

  beforeEach(() => {
    fetchMock.mockReset()
    parseStringMock.mockReset()

    fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<rss />'),
    })
    setupExecutor()
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

    const count = await fetchHatenaArticles(env)

    expect(count).toBe(1)
    expect(fetchMock).toHaveBeenCalledWith('https://b.hatena.ne.jp/hotentry/it.rss')
    const insertCalls = getInsertCalls()
    expect(insertCalls).toHaveLength(1)
    const params = insertCalls[0][1] as unknown[]
    // INFO: insert の params は (media, title, author, description, url) の順で渡る
    expect(params).toContain('はてなブックマーク')
    expect(params).toContain('本文')
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

    const count = await fetchHatenaArticles(env)

    expect(count).toBe(2)
    expect(getInsertCalls()).toHaveLength(2)
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

    const count = await fetchHatenaArticles(env)

    expect(count).toBe(1)
    expect(getInsertCalls()).toHaveLength(1)
  })

  it('保存時にlibsqlの一意制約違反が発生した記事はスキップして継続する', async () => {
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
    let insertCount = 0
    mockRdbExecutor.mockImplementation(async (sql: string) => {
      if (/^\s*select/i.test(sql)) return { rows: [] }
      insertCount += 1
      if (insertCount === 1) {
        throw new LibsqlError('UNIQUE constraint failed: articles.url', 'SQLITE_CONSTRAINT_UNIQUE')
      }
      return { rows: [] }
    })

    const count = await fetchHatenaArticles(env)

    expect(count).toBe(1)
    expect(getInsertCalls()).toHaveLength(2)
  })

  it('保存時にD1の一意制約違反が発生した記事はスキップして継続する', async () => {
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
    let insertCount = 0
    mockRdbExecutor.mockImplementation(async (sql: string) => {
      if (/^\s*select/i.test(sql)) return { rows: [] }
      insertCount += 1
      if (insertCount === 1) {
        // INFO: D1 は code を持たずメッセージに 'UNIQUE constraint failed' を含む Error を投げる
        throw new Error('D1_ERROR: UNIQUE constraint failed: articles.url: SQLITE_CONSTRAINT')
      }
      return { rows: [] }
    })

    const count = await fetchHatenaArticles(env)

    expect(count).toBe(1)
    expect(getInsertCalls()).toHaveLength(2)
  })

  it('libsqlのNOT NULL制約違反は握りつぶさずに送出する', async () => {
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
    mockRdbExecutor.mockImplementation(async (sql: string) => {
      if (/^\s*select/i.test(sql)) return { rows: [] }
      // INFO: NOT NULL 制約違反は UNIQUE 制約違反ではないため握りつぶしてはいけない
      throw new LibsqlError(
        'NOT NULL constraint failed: articles.title',
        'SQLITE_CONSTRAINT_NOTNULL',
      )
    })

    const error = await fetchHatenaArticles(env).then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(Error)
    const causeMessage = (error as { cause?: { message?: string } }).cause?.message
    expect(causeMessage).toContain('NOT NULL constraint failed')
  })

  it('D1のNOT NULL制約違反は握りつぶさずに送出する', async () => {
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
    mockRdbExecutor.mockImplementation(async (sql: string) => {
      if (/^\s*select/i.test(sql)) return { rows: [] }
      // INFO: D1 は code を持たずメッセージに 'NOT NULL constraint failed' を含む Error を投げる
      throw new Error('D1_ERROR: NOT NULL constraint failed: articles.title: SQLITE_CONSTRAINT')
    })

    const error = await fetchHatenaArticles(env).then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(Error)
    const causeMessage = (error as { cause?: { message?: string } }).cause?.message
    expect(causeMessage).toContain('NOT NULL constraint failed')
  })

  it('一意制約違反以外のエラーは握りつぶさずに送出する', async () => {
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
    mockRdbExecutor.mockImplementation(async (sql: string) => {
      if (/^\s*select/i.test(sql)) return { rows: [] }
      throw new Error('disk I/O error')
    })

    // INFO: DrizzleがDrizzleQueryErrorでラップするため、元のエラーは cause に格納される
    const error = await fetchHatenaArticles(env).then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(Error)
    const causeMessage = (error as { cause?: { message?: string } }).cause?.message
    expect(causeMessage).toContain('disk I/O error')
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

    const count = await fetchHatenaArticles(env)

    expect(count).toBe(3)
    const insertCalls = getInsertCalls()
    expect(insertCalls).toHaveLength(3)
    // INFO: insert の params に description が含まれることを順番に検証する
    expect(insertCalls[0][1] as unknown[]).toContain('encoded本文')
    expect(insertCalls[1][1] as unknown[]).toContain('snippet本文')
    expect(insertCalls[2][1] as unknown[]).toContain('')
  })

  it('保存完了後に接続をクローズする', async () => {
    parseStringMock.mockResolvedValue({ items: [] })

    await fetchHatenaArticles(env)

    expect(closeRdbClient).toHaveBeenCalled()
  })
})

type D1Database = import('@cloudflare/workers-types').D1Database
