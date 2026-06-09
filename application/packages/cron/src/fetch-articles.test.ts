import type { RdbClient } from '@trend-diary/datastore/rdb'
import { ok } from 'neverthrow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHatenaArticles } from './fetch-articles'

const fetchMock = vi.hoisted(() => vi.fn())
const parseStringMock = vi.hoisted(() => vi.fn())
const storeArticlesMock = vi.hoisted(() => vi.fn())

vi.stubGlobal('fetch', fetchMock)

vi.mock('rss-parser', () => ({
  default: class MockParser {
    parseString(xml: string) {
      return parseStringMock(xml)
    }
  },
}))

vi.mock('./store-articles', () => ({
  storeArticles: storeArticlesMock,
}))

const db = {} as RdbClient

describe('fetchHatenaArticles', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    parseStringMock.mockReset()
    storeArticlesMock.mockReset()

    storeArticlesMock.mockResolvedValue(ok(0))
    fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<rss />'),
    })
  })

  it('creatorが欠損した記事はauthorをフォールバック値で補完してstoreArticlesへ渡す', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        {
          title: '記事タイトル',
          content: '本文',
          link: 'https://example.com/1',
        },
      ],
    })

    await fetchHatenaArticles(db)

    expect(fetchMock).toHaveBeenCalledWith('https://b.hatena.ne.jp/hotentry/it.rss')
    expect(storeArticlesMock).toHaveBeenCalledWith(
      'hatena',
      [
        {
          title: '記事タイトル',
          author: 'はてなブックマーク',
          description: '本文',
          url: 'https://example.com/1',
        },
      ],
      db,
    )
  })

  it('contentが欠損した記事は優先順位でdescriptionを補完してstoreArticlesへ渡す', async () => {
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

    await fetchHatenaArticles(db)

    expect(storeArticlesMock).toHaveBeenCalledWith(
      'hatena',
      [
        {
          title: '記事1',
          author: '投稿者1',
          description: 'encoded本文',
          url: 'https://example.com/1',
        },
        {
          title: '記事2',
          author: '投稿者2',
          description: 'snippet本文',
          url: 'https://example.com/2',
        },
        {
          title: '記事3',
          author: '投稿者3',
          description: '',
          url: 'https://example.com/3',
        },
      ],
      db,
    )
  })

  it('RSS取得に失敗した場合はerrを返しstoreArticlesを呼ばない', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    })

    const result = await fetchHatenaArticles(db)

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error)
    expect(storeArticlesMock).not.toHaveBeenCalled()
  })
})
