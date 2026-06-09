import { mockRdbClient as db, mockRdbExecutor } from '@trend-diary/datastore/test-helper/rdb'
import { describe, expect, it } from 'vitest'
import { storeArticles } from './store-articles'

// 既存URL検索(select)で「既に保存済みのURL」を返すための注入ヘルパー。
// クエリビルダはカラム順の配列として行を解釈するため、url を配列で渡す。
function mockExistingUrls(urls: string[]) {
  mockRdbExecutor.mockResolvedValueOnce({ rows: urls.map((url) => [url]) })
}

function insertCalls() {
  return mockRdbExecutor.mock.calls.filter(([sql]) => sql.includes('insert into "articles"'))
}

describe('storeArticles', () => {
  it('itemsが空の場合はDBへ問い合わせず0を返す', async () => {
    const result = await storeArticles('hatena', [], db)

    expect(result._unsafeUnwrap()).toBe(0)
    expect(mockRdbExecutor).not.toHaveBeenCalled()
  })

  it('新規記事をmedia付きで1件ずつinsertする', async () => {
    const result = await storeArticles(
      'qiita',
      [
        { title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' },
        { title: '記事B', author: '投稿者B', description: '本文B', url: 'https://example.com/b' },
      ],
      db,
    )

    expect(result._unsafeUnwrap()).toBe(2)
    // 1件ずつ = insertが記事数ぶん別々に呼ばれる
    const inserts = insertCalls()
    expect(inserts).toHaveLength(2)
    expect(inserts[0][1]).toEqual(['qiita', '記事A', '投稿者A', '本文A', 'https://example.com/a'])
    expect(inserts[1][1]).toEqual(['qiita', '記事B', '投稿者B', '本文B', 'https://example.com/b'])
  })

  it('同一URLの重複記事は1件だけinsertする', async () => {
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
      db,
    )

    expect(result._unsafeUnwrap()).toBe(1)
    expect(insertCalls()).toHaveLength(1)
  })

  it('既にDBへ保存済みのURLはinsertせず0を返す', async () => {
    mockExistingUrls(['https://example.com/a'])

    const result = await storeArticles(
      'hatena',
      [{ title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' }],
      db,
    )

    expect(result._unsafeUnwrap()).toBe(0)
    expect(insertCalls()).toHaveLength(0)
  })

  it('保存済みURLと新規URLが混在する場合は新規分のみinsertする', async () => {
    mockExistingUrls(['https://example.com/a'])

    const result = await storeArticles(
      'hatena',
      [
        { title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' },
        { title: '記事B', author: '投稿者B', description: '本文B', url: 'https://example.com/b' },
      ],
      db,
    )

    expect(result._unsafeUnwrap()).toBe(1)
    const inserts = insertCalls()
    expect(inserts).toHaveLength(1)
    expect(inserts[0][1]).toContain('https://example.com/b')
  })

  it('一意制約違反のinsertはスキップして処理を継続する', async () => {
    // 1件目insertでUNIQUE制約違反、2件目は成功
    mockRdbExecutor
      .mockResolvedValueOnce({ rows: [] }) // 既存URL検索
      .mockRejectedValueOnce(new Error('UNIQUE constraint failed: articles.url')) // 1件目insert
      .mockResolvedValueOnce({ rows: [] }) // 2件目insert

    const result = await storeArticles(
      'hatena',
      [
        { title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' },
        { title: '記事B', author: '投稿者B', description: '本文B', url: 'https://example.com/b' },
      ],
      db,
    )

    expect(result._unsafeUnwrap()).toBe(1)
  })

  it('一意制約以外のDBエラーはerrを返す', async () => {
    mockRdbExecutor
      .mockResolvedValueOnce({ rows: [] }) // 既存URL検索
      .mockRejectedValueOnce(new Error('database is locked')) // insert失敗

    const result = await storeArticles(
      'hatena',
      [{ title: '記事A', author: '投稿者A', description: '本文A', url: 'https://example.com/a' }],
      db,
    )

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().message).toContain('database is locked')
  })

  it('最大長を超えるフィールドはコードポイント単位で切り詰めてinsertする', async () => {
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
      db,
    )

    const params = insertCalls()[0][1] as string[]
    expect(params).toContain('あ'.repeat(100))
    expect(params).toContain('い'.repeat(30))
  })
})
