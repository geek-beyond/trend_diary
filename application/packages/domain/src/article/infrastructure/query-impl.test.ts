import { type SQL, sql } from 'drizzle-orm'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'
import { beforeEach, describe, expect, it } from 'vitest'
import getRdbClient, { mockRdbExecutor } from '../../test-helper/rdb'
import QueryImpl from './query-impl'

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()

interface DateRangeSqlBuilders {
  buildClosedOpenDateRangeSql(columnName: string, fromDate: Date, toDateExclusive: Date): SQL
  buildDateRangeConditions(
    columnName: string,
    range: { fromDate?: Date; toDateExclusive?: Date },
  ): SQL[]
}
// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- privateなstaticメソッドをホワイトボックステストするため、型システムを意図的に迂回する必要があるためです
const dateRangeSqlBuilders = QueryImpl as unknown as DateRangeSqlBuilders

interface DateRangeEnumerator {
  enumerateJstDateRange(fromDateJst: string, toDateJst: string): string[]
}
// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- privateなstaticメソッドをホワイトボックステストするため、型システムを意図的に迂回する必要があるためです
const dateRangeEnumerator = QueryImpl as unknown as DateRangeEnumerator

describe('QueryImpl', () => {
  let queryImpl: QueryImpl

  beforeEach(() => {
    queryImpl = new QueryImpl(getRdbClient())
  })

  it.todo('DB方言ごとにcreatedAt/readAtの日時正規化SQLを切り替えられる')

  describe('searchArticles', () => {
    it('ページネーション付きで記事を検索できる', async () => {
      // INFO: 生SQL(db.all)は実ドライバ(libsql)でカラム別名キーのオブジェクトを返すため、
      // モックも別名キーのオブジェクトで戻り行を注入する。総件数は COUNT(*) OVER() で各行に付与される
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [
          {
            articleId: 1,
            media: 'qiita',
            title: 'TypeScriptの型安全性について',
            author: '山田太郎',
            description: 'TypeScriptの型安全性に関する解説記事です',
            url: 'https://example.com/article/1',
            createdAt: '2024-01-15T09:30:00.000Z',
            isRead: null,
            total: 2,
          },
          {
            articleId: 2,
            media: 'zenn',
            title: 'Reactのフック活用法',
            author: '佐藤花子',
            description: 'Reactのフックについて詳しく解説します',
            url: 'https://example.com/article/2',
            createdAt: '2024-01-14T10:00:00.000Z',
            isRead: null,
            total: 2,
          },
        ],
      })

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 })

      expect(result.isOk()).toBe(true)
      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      if (result.isOk()) {
        expect(result.value.total).toBe(2)
        expect(result.value.data).toHaveLength(2)
        expect(result.value.data[0].isRead).toBeUndefined()
      }
    })

    it('activeUserId指定時は既読状態を返す', async () => {
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [
          {
            articleId: 1,
            media: 'qiita',
            title: 'TypeScriptの型安全性について',
            author: '山田太郎',
            description: 'TypeScriptの型安全性に関する解説記事です',
            url: 'https://example.com/article/1',
            createdAt: '2024-01-15T09:30:00.000Z',
            isRead: 1,
            total: 2,
          },
          {
            articleId: 2,
            media: 'zenn',
            title: 'Reactのフック活用法',
            author: '佐藤花子',
            description: 'Reactのフックについて詳しく解説します',
            url: 'https://example.com/article/2',
            createdAt: '2024-01-14T10:00:00.000Z',
            isRead: 0,
            total: 2,
          },
        ],
      })

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 }, 10n)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.data[0].isRead).toBe(true)
        expect(result.value.data[1].isRead).toBe(false)
      }
    })

    it('activeUserId指定時はスキップ済み記事を除外する条件を付与する', async () => {
      mockRdbExecutor.mockResolvedValueOnce({ rows: [] })

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 }, 10n)

      expect(result.isOk()).toBe(true)
      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      const rawSql = mockRdbExecutor.mock.calls[0]?.[0] ?? ''
      expect(rawSql).toContain('skipped_articles')
    })

    it.each([
      { name: '複数media', media: ['qiita', 'zenn'] as const },
      { name: '単一media', media: ['hatena'] as const },
    ])('$name 指定時は IN 句で絞り込む', async ({ media }) => {
      mockRdbExecutor.mockResolvedValueOnce({ rows: [] })

      await queryImpl.searchArticles({ page: 1, limit: 20, media: [...media] })

      const rawSql = String(mockRdbExecutor.mock.calls[0]?.[0] ?? '')
      expect(rawSql).toContain('media IN (')
    })

    it('日時式ではなくarticle_idの降順でソートする', async () => {
      mockRdbExecutor.mockResolvedValueOnce({ rows: [] })

      await queryImpl.searchArticles({ page: 1, limit: 20 })

      const articleSql = String(mockRdbExecutor.mock.calls[0]?.[0] ?? '')
      expect(articleSql).toContain('ORDER BY article_id DESC')
      expect(articleSql).not.toContain('unixepoch')
    })

    it('0件時はtotalが0になる', async () => {
      mockRdbExecutor.mockResolvedValueOnce({ rows: [] })

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 })

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.total).toBe(0)
        expect(result.value.data).toHaveLength(0)
      }
    })

    it('from/to指定時はインデックス付き生成列(created_at_norm)で範囲比較する', async () => {
      mockRdbExecutor.mockResolvedValueOnce({ rows: [] })

      await queryImpl.searchArticles({ page: 1, limit: 20, from: '2026-03-05', to: '2026-03-05' })

      // フルスキャンを招くCASE正規化ではなく、サーガブルな生成列比較になっていること。
      // COUNT(*) OVER() で1クエリ化したため呼び出しは1回
      const rawSql = String(mockRdbExecutor.mock.calls[0]?.[0] ?? '')
      expect(rawSql).toContain('created_at_norm')
      expect(rawSql).not.toContain('unixepoch')
    })

    it('取得失敗時はエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('search failed'))

      const result = await queryImpl.searchArticles({ page: 1, limit: 20 })

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('search failed')
      }
    })

    it('from/to指定時は取得後に日付で絞り込みできる', async () => {
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [
          {
            articleId: 1,
            media: 'qiita',
            title: '対象記事1',
            author: '山田',
            description: '当日の記事1',
            url: 'https://example.com/article/1',
            createdAt: '2026-03-04T15:00:00.000Z',
            total: 2,
          },
          {
            articleId: 2,
            media: 'zenn',
            title: '対象記事2',
            author: '鈴木',
            description: '当日の記事2',
            url: 'https://example.com/article/2',
            createdAt: '2026-03-05T14:59:59.999Z',
            total: 2,
          },
        ],
      })

      const result = await queryImpl.searchArticles({
        page: 1,
        limit: 20,
        from: '2026-03-05',
        to: '2026-03-05',
      })

      expect(result.isOk()).toBe(true)
      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)

      if (result.isOk()) {
        expect(result.value.total).toBe(2)
        expect(result.value.data).toHaveLength(2)
        expect(result.value.data[0].title).toBe('対象記事1')
        expect(result.value.data[1].title).toBe('対象記事2')
      }
    })
  })

  describe('findArticleById', () => {
    it('記事をIDで検索できる', async () => {
      // INFO: クエリビルダ(select)の戻り行はカラム順の配列:
      // article_id, media, title, author, description, url, created_at
      mockRdbExecutor.mockResolvedValue({
        rows: [
          [
            1,
            'qiita',
            'TypeScriptの型安全性について',
            '山田太郎',
            'TypeScriptの型安全性に関する解説記事です',
            'https://example.com/article/1',
            '2024-01-15T09:30:00.000Z',
          ],
        ],
      })

      const result = await queryImpl.findArticleById(1n)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value?.articleId).toBe(1n)
      }
    })

    it('該当記事がない場合はnullを返す', async () => {
      mockRdbExecutor.mockResolvedValue({ rows: [] })

      const result = await queryImpl.findArticleById(999n)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBeNull()
      }
    })
  })

  describe('getUnreadDigestionArticles', () => {
    it.each([
      {
        name: 'createdAtがstring(ISO-8601)',
        createdAt: '2026-03-07T01:00:00.000Z',
        expectedIso: '2026-03-07T01:00:00.000Z',
        media: undefined,
      },
      {
        name: 'createdAtがCURRENT_TIMESTAMP形式(スペース区切りUTC)はTZ非依存でUTC解釈される',
        createdAt: '2025-01-01 00:00:00',
        expectedIso: '2025-01-01T00:00:00.000Z',
        media: ['qiita'] as const,
      },
      {
        name: 'createdAtがnumber(epoch ms)',
        createdAt: 1_772_852_400_000,
        expectedIso: '2026-03-07T03:00:00.000Z',
        media: ['hatena'] as const,
      },
      {
        name: 'createdAtがbigint(epoch ms)',
        createdAt: 1_772_852_400_000n,
        expectedIso: '2026-03-07T03:00:00.000Z',
        media: ['zenn'] as const,
      },
    ])('$name をArticleへ変換できる', async ({ createdAt, expectedIso, media }) => {
      mockRdbExecutor.mockResolvedValue({
        rows: [
          {
            articleId: 1,
            media: 'qiita',
            title: '未読消化対象',
            author: '山田太郎',
            description: '未読消化の説明',
            url: 'https://example.com/unread',
            createdAt,
            total: 1,
          },
        ],
      })

      const result = await queryImpl.getUnreadDigestionArticles(
        10n,
        '2026-03-07',
        media ? [...media] : undefined,
      )

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.total).toBe(1)
        expect(result.value.articles).toHaveLength(1)
        expect(result.value.articles[0].articleId).toBe(1n)
        expect(result.value.articles[0].title).toBe('未読消化対象')
        expect(result.value.articles[0].createdAt.toISOString()).toBe(expectedIso)
      }
    })

    it('未読総数(COUNT(*) OVER())を併せて返し、ペイロードを抑える上限件数(100)でLIMITする', async () => {
      // LIMITで返るのは100件でも、totalはLIMIT前の全件数(250)を各行が持つ
      mockRdbExecutor.mockResolvedValue({
        rows: [
          {
            articleId: 1,
            media: 'qiita',
            title: 't',
            author: 'a',
            description: 'd',
            url: 'https://example.com/unread',
            createdAt: '2026-03-07T00:00:00.000Z',
            total: 250,
          },
        ],
      })

      const result = await queryImpl.getUnreadDigestionArticles(10n, '2026-03-07')

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value.total).toBe(250)
      }
      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      const sqlText = String(mockRdbExecutor.mock.calls[0]?.[0] ?? '')
      const params = mockRdbExecutor.mock.calls[0]?.[1] ?? []
      expect(sqlText).toContain('COUNT(*) OVER()')
      expect(sqlText).toContain('LIMIT ?')
      expect(params).toContain(100)
    })

    it('DB取得失敗時はエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('unread digestion failed'))

      const result = await queryImpl.getUnreadDigestionArticles(10n, '2026-03-07')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('unread digestion failed')
      }
    })

    // DB の media カラムは任意文字列のため、未知の値＝データ破損は補完せず契約違反として送出する
    it('未知の media を含む行は契約違反として送出する', async () => {
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [
          {
            articleId: 1,
            media: 'unknown-media',
            title: 't',
            author: 'a',
            description: 'd',
            url: 'https://example.com/unread',
            createdAt: '2026-03-07T00:00:00.000Z',
            total: 1,
          },
        ],
      })

      await expect(queryImpl.getUnreadDigestionArticles(10n, '2026-03-07')).rejects.toThrow(
        'Article row has unknown media',
      )
    })
  })

  describe('getDailyDiary', () => {
    it('日次サマリーとsources、read一覧を取得できる', async () => {
      // INFO: サマリー集計(rowKind=source)とread一覧(rowKind=read)を1クエリでUNION ALL取得する
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [
          { rowKind: 'source', sourceType: 'read', media: 'qiita', count: 2 },
          { rowKind: 'source', sourceType: 'read', media: 'zenn', count: 1 },
          { rowKind: 'source', sourceType: 'skip', media: 'qiita', count: 1 },
          { rowKind: 'source', sourceType: 'skip', media: 'hatena', count: 1 },
          {
            rowKind: 'read',
            readHistoryId: 10,
            articleId: 1,
            media: 'qiita',
            title: 'Go error handling',
            url: 'https://example.com/go-error-handling',
            readAt: '2026-03-07T03:00:00.000Z',
          },
          {
            rowKind: 'read',
            readHistoryId: 9,
            articleId: 1,
            media: 'qiita',
            title: 'Go error handling',
            url: 'https://example.com/go-error-handling',
            readAt: '2026-03-07T02:00:00.000Z',
          },
        ],
      })

      const result = await queryImpl.getDailyDiary(10n, '2026-03-07', 1, 10)

      expect(result.isOk()).toBe(true)
      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      if (result.isOk()) {
        expect(result.value.summary).toEqual({ read: 3, skip: 2 })
        expect(result.value.sources).toEqual([
          { media: 'qiita', read: 2, skip: 1 },
          { media: 'zenn', read: 1, skip: 0 },
          { media: 'hatena', read: 0, skip: 1 },
        ])
        expect(result.value.reads.total).toBe(3)
        expect(result.value.reads.data).toHaveLength(2)
        expect(result.value.reads.data[0].readHistoryId).toBe(10n)
        expect(result.value.reads.data[0].url).toBe('https://example.com/go-error-handling')
        expect(result.value.reads.data[1].readHistoryId).toBe(9n)
      }
    })

    it('インデックス付き生成列(read_at_norm)で範囲比較・並び替えする', async () => {
      mockRdbExecutor.mockResolvedValueOnce({ rows: [] })

      await queryImpl.getDailyDiary(10n, '2026-03-07', 1, 10)

      // サマリー集計とread一覧を1クエリにまとめたため呼び出しは1回
      const readsSql = String(mockRdbExecutor.mock.calls[0]?.[0] ?? '')
      expect(readsSql).toContain('read_at_norm')
      expect(readsSql).toContain('ORDER BY rh.read_at_norm DESC')
      expect(readsSql).not.toContain('unixepoch')
    })

    it('DB取得失敗時はエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('daily diary failed'))

      const result = await queryImpl.getDailyDiary(10n, '2026-03-07', 1, 10)

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('daily diary failed')
      }
    })

    // UNION ALL が rowKind ごとに必須カラムを非 NULL で返す契約の破れは、
    // デフォルト値で補完せず契約違反として送出することを担保する
    const contractViolationCases = [
      {
        name: 'source行のsourceTypeがNULL',
        row: { rowKind: 'source', sourceType: null, media: 'qiita', count: 2 },
        expectedMessage: 'Diary source row must have sourceType and count',
      },
      {
        name: 'source行のcountがNULL',
        row: { rowKind: 'source', sourceType: 'read', media: 'qiita', count: null },
        expectedMessage: 'Diary source row must have sourceType and count',
      },
      {
        name: 'read行のtitleがNULL',
        row: {
          rowKind: 'read',
          readHistoryId: 10,
          articleId: 1,
          media: 'qiita',
          title: null,
          url: 'https://example.com/go-error-handling',
          readAt: '2026-03-07T03:00:00.000Z',
        },
        expectedMessage: 'Diary read row must have all read columns',
      },
      {
        name: 'read行のreadHistoryIdがNULL',
        row: {
          rowKind: 'read',
          readHistoryId: null,
          articleId: 1,
          media: 'qiita',
          title: 'Go error handling',
          url: 'https://example.com/go-error-handling',
          readAt: '2026-03-07T03:00:00.000Z',
        },
        expectedMessage: 'Diary read row must have all read columns',
      },
      {
        name: 'source行のmediaが未知',
        row: { rowKind: 'source', sourceType: 'read', media: 'unknown-media', count: 2 },
        expectedMessage: 'Diary source row has unknown media',
      },
      {
        name: 'read行のmediaが未知',
        row: {
          rowKind: 'read',
          readHistoryId: 10,
          articleId: 1,
          media: 'unknown-media',
          title: 'Go error handling',
          url: 'https://example.com/go-error-handling',
          readAt: '2026-03-07T03:00:00.000Z',
        },
        expectedMessage: 'Diary read row has unknown media',
      },
    ]

    it.each(contractViolationCases)(
      '$name の行は契約違反として送出する',
      async ({ row, expectedMessage }) => {
        mockRdbExecutor.mockResolvedValueOnce({ rows: [row] })

        await expect(queryImpl.getDailyDiary(10n, '2026-03-07', 1, 10)).rejects.toThrow(
          expectedMessage,
        )
      },
    )
  })

  describe('getDailyDiaryRange', () => {
    it('指定期間の日次サマリーとsourcesを取得できる', async () => {
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [
          { sourceType: 'read', date: '2026-03-06', media: 'qiita', count: 2 },
          { sourceType: 'read', date: '2026-03-07', media: 'zenn', count: 1 },
          { sourceType: 'skip', date: '2026-03-07', media: 'hatena', count: 1 },
        ],
      })

      const result = await queryImpl.getDailyDiaryRange(10n, '2026-03-06', '2026-03-07')

      expect(result.isOk()).toBe(true)
      expect(mockRdbExecutor).toHaveBeenCalledTimes(1)
      if (result.isOk()) {
        expect(result.value).toEqual([
          {
            date: '2026-03-06',
            summary: { read: 2, skip: 0 },
            sources: [
              { media: 'qiita', read: 2, skip: 0 },
              { media: 'zenn', read: 0, skip: 0 },
              { media: 'hatena', read: 0, skip: 0 },
            ],
          },
          {
            date: '2026-03-07',
            summary: { read: 1, skip: 1 },
            sources: [
              { media: 'qiita', read: 0, skip: 0 },
              { media: 'zenn', read: 1, skip: 0 },
              { media: 'hatena', read: 0, skip: 1 },
            ],
          },
        ])
      }
    })

    it('DB取得失敗時はエラーを返す', async () => {
      mockRdbExecutor.mockRejectedValue(new Error('daily diary range failed'))

      const result = await queryImpl.getDailyDiaryRange(10n, '2026-03-06', '2026-03-07')

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error.message).toBe('daily diary range failed')
      }
    })

    // 未知の media を黙って捨てると summary と sources の集計が静かに食い違うため送出する
    it('未知の media を含む行は契約違反として送出する', async () => {
      mockRdbExecutor.mockResolvedValueOnce({
        rows: [{ sourceType: 'read', date: '2026-03-06', media: 'unknown-media', count: 2 }],
      })

      await expect(queryImpl.getDailyDiaryRange(10n, '2026-03-06', '2026-03-07')).rejects.toThrow(
        'Diary source row has unknown media',
      )
    })
  })

  describe('enumerateJstDateRange', () => {
    it('範囲内の日付を列挙できる', () => {
      const result = dateRangeEnumerator.enumerateJstDateRange('2026-03-06', '2026-03-08')

      expect(result).toEqual(['2026-03-06', '2026-03-07', '2026-03-08'])
    })

    it.each([
      // fromDateJstが不正だと辞書順比較次第で空配列を正常値として返しうるため、契約違反として送出する
      { name: 'fromDateJstが不正', from: 'invalid', to: '2026-03-08', invalid: 'invalid' },
      // toDateJstが不正だと辞書順比較で常にcurrentより大きく、Date上限まで巨大ループになるのを防ぐ
      { name: 'toDateJstが不正', from: '2026-03-06', to: 'invalid', invalid: 'invalid' },
    ])('$nameな場合は契約違反として送出する', ({ from, to, invalid }) => {
      expect(() => dateRangeEnumerator.enumerateJstDateRange(from, to)).toThrow(
        `enumerateJstDateRange received an invalid date string: ${invalid}`,
      )
    })

    // from > to は API 境界(validateDiaryDateRange)で 422 検証済みのため、到達は契約違反
    it('fromDateJstがtoDateJstより大きい場合は契約違反として送出する', () => {
      expect(() => dateRangeEnumerator.enumerateJstDateRange('2026-03-08', '2026-03-06')).toThrow(
        'enumerateJstDateRange received fromDateJst (2026-03-08) greater than toDateJst (2026-03-06)',
      )
    })
  })

  describe('日付範囲SQLビルダの同一性', () => {
    const dialect = new SQLiteSyncDialect()
    const fromDate = new Date('2026-03-06T00:00:00.000Z')
    const toDateExclusive = new Date('2026-03-07T00:00:00.000Z')

    it('buildClosedOpenDateRangeSqlとbuildDateRangeConditions(両端あり)は同一のSQL/パラメータを生成する', () => {
      const closedOpen = dialect.sqlToQuery(
        dateRangeSqlBuilders.buildClosedOpenDateRangeSql('created_at', fromDate, toDateExclusive),
      )
      const conditions = dateRangeSqlBuilders.buildDateRangeConditions('created_at', {
        fromDate,
        toDateExclusive,
      })
      const joined = dialect.sqlToQuery(sql.join(conditions, sql.raw(' AND ')))

      expect(normalize(closedOpen.sql)).toBe(normalize(joined.sql))
      expect(closedOpen.params).toEqual(joined.params)
    })
  })
})
