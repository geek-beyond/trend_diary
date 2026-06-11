import { ServerError } from '@trend-diary/common/errors'
import { addJstDays, toJstDate } from '@trend-diary/common/locale/date'
import type { OffsetPaginationResult } from '@trend-diary/common/pagination'
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@trend-diary/common/pagination'
import type { Nullable } from '@trend-diary/common/types/utility'
import { articles, normalizeDateTime } from '@trend-diary/datastore/drizzle-orm/schema'
import type { RdbClient } from '@trend-diary/datastore/rdb'
import { wrapDbCall } from '@trend-diary/datastore/rdb'
import { fromDbId, toDbId } from '@trend-diary/datastore/rdb/id'
import { eq, type SQL, sql } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import { ARTICLE_MEDIA, type ArticleMedia } from '../media'
import type { Query } from '../repository'
import type {
  Article,
  ArticleWithOptionalReadStatus,
  UnreadDigestionResult,
} from '../schema/article-schema'
import type { DailyDiary, DailyDiaryRangeItem, DiaryReadItem } from '../schema/diary-schema'
import type { QueryParams } from '../schema/query-schema'
import fromRdbToArticle from './mapper'

interface RawArticleRow {
  articleId: number | bigint
  media: string
  title: string
  author: string
  description: string
  url: string
  // INFO: 生SQL(db.all)はcustomTypeを通らずドライバの素値(文字列/数値)を返す。Dateにはならない
  createdAt: string | number | bigint
  isRead?: number | bigint | boolean | null
}

interface RawCountRow {
  total: number | bigint
}

interface RawDiarySourceRow {
  media: string
  count: number | bigint
}

interface RawDiaryTypedSourceRow {
  sourceType: 'read' | 'skip'
  media: string
  count: number | bigint
}

interface RawDiaryDateSourceRow {
  date: string
  media: string
  count: number | bigint
}

interface RawDiaryDateTypedSourceRow {
  sourceType: 'read' | 'skip'
  date: string
  media: string
  count: number | bigint
}

interface RawDiaryReadRow {
  readHistoryId: number | bigint
  articleId: number | bigint
  media: string
  title: string
  url: string
  // INFO: 生SQL(db.all)はcustomTypeを通らずドライバの素値(文字列/数値)を返す。Dateにはならない
  readAt: string | number | bigint
}

// サマリー集計行(source)とread一覧行(read)をUNION ALLで1度に取得するための共用行。
// 各行は rowKind に応じて片方のカラム群だけが非NULLになる
interface RawDiaryCombinedRow {
  rowKind: 'source' | 'read'
  sourceType: 'read' | 'skip' | null
  media: string
  count: number | bigint | null
  readHistoryId: number | bigint | null
  articleId: number | bigint | null
  title: string | null
  url: string | null
  readAt: string | number | bigint | null
}

interface DateRange {
  fromDate?: Date
  toDateExclusive?: Date
}

// 一覧を分割取得しペイロードを有界化する上限。read/skip済みはWHEREで除外されるため、
// 再取得は自然と続きになりオフセットは不要
const UNREAD_DIGESTION_LIMIT = 100

type NormalizedDateTimeColumn = 'created_at' | 'rh.read_at' | 'sa.created_at'

// 正規化済みの値はインデックス付きVIRTUAL生成列(*_norm)に保持済みのため、
// 比較・並び替え・集計は生成列を直接参照してサーガブルにする
const NORMALIZED_DATETIME_COLUMN: Record<NormalizedDateTimeColumn, string> = {
  created_at: 'created_at_norm',
  'rh.read_at': 'rh.read_at_norm',
  'sa.created_at': 'sa.created_at_norm',
}

export default class QueryImpl implements Query {
  constructor(private readonly db: RdbClient) {}

  async searchArticles(
    params: QueryParams,
    activeUserId?: bigint,
  ): Promise<Result<OffsetPaginationResult<ArticleWithOptionalReadStatus>, ServerError>> {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, from, to, ...searchParams } = params
    const dbActiveUserId = activeUserId !== undefined ? toDbId(activeUserId) : undefined
    const whereSql = QueryImpl.buildSqlWhereClause({
      title: searchParams.title,
      author: searchParams.author,
      media: searchParams.media,
      from,
      to,
      readStatus: searchParams.readStatus,
      activeUserId: dbActiveUserId,
    })

    const readStatusSql = QueryImpl.buildIsReadSelectSql(dbActiveUserId)

    // COUNTと取得を COUNT(*) OVER() で1クエリ(1往復)に集約する。
    // D1のdb.batchは生SQL(SQLiteRaw)を扱えないため、ウィンドウ関数で総件数を同時に取得する
    const result = await wrapDbCall(() =>
      this.db.all<RawArticleRow & RawCountRow>(sql`
        SELECT
          article_id as articleId,
          media,
          title,
          author,
          description,
          url,
          created_at as createdAt,
          ${readStatusSql} as isRead,
          COUNT(*) OVER() as total
        FROM articles
        ${whereSql}
        ORDER BY article_id DESC
        LIMIT ${limit}
        OFFSET ${(page - 1) * limit}
      `),
    )
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const articleRows = result.value
    // 行が無いページ(該当0件、または範囲外ページ)では total は 0 になる。
    // db.batchが生SQLを扱えない制約下で1往復を優先した割り切り（範囲外ページはUIのNext無効化で通常到達しない）
    const total = Number(articleRows[0]?.total ?? 0)
    const mappedArticles = articleRows.map(QueryImpl.mapRawArticleToDomain)

    const totalPages = Math.ceil(total / limit)
    return ok({
      data: mappedArticles,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    })
  }

  async findArticleById(articleId: bigint): Promise<Result<Nullable<Article>, ServerError>> {
    const dbArticleId = toDbId(articleId)
    const result = await wrapDbCall(() =>
      this.db.select().from(articles).where(eq(articles.articleId, dbArticleId)),
    )
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const article = result.value[0]
    if (!article) return ok(null)
    return ok(fromRdbToArticle(article))
  }

  async getUnreadDigestionArticles(
    activeUserId: bigint,
    targetDateJst: string,
    media?: ArticleMedia,
  ): Promise<Result<UnreadDigestionResult, ServerError>> {
    const dbActiveUserId = toDbId(activeUserId)
    const { fromDate, toDateExclusive } = QueryImpl.buildDateRange(targetDateJst, targetDateJst)
    const createdAtRangeSql = QueryImpl.buildClosedOpenDateRangeSql(
      'created_at',
      fromDate,
      toDateExclusive,
    )

    const mediaCondition = media ? sql`AND articles.media = ${media}` : sql.empty()

    // D1のdb.batchは生SQLを扱えないため、総数はウィンドウ関数で一覧と同時に取得する
    const result = await wrapDbCall(() =>
      this.db.all<RawArticleRow & RawCountRow>(sql`
        SELECT
          article_id as articleId,
          media,
          title,
          author,
          description,
          url,
          created_at as createdAt,
          COUNT(*) OVER() as total
        FROM articles
        WHERE
          ${createdAtRangeSql}
          AND NOT (${QueryImpl.buildReadHistoryExistsSql(dbActiveUserId)})
          AND NOT EXISTS (
            SELECT 1
            FROM skipped_articles sa
            WHERE sa.article_id = articles.article_id
              AND sa.active_user_id = ${dbActiveUserId}
          )
          ${mediaCondition}
        ORDER BY article_id DESC
        LIMIT ${UNREAD_DIGESTION_LIMIT}
      `),
    )
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const articleRows = result.value
    // 未読が無い場合は行が返らずtotalも0になる
    const total = Number(articleRows[0]?.total ?? 0)

    return ok({ articles: articleRows.map(QueryImpl.mapRawArticle), total })
  }

  async getDailyDiary(
    activeUserId: bigint,
    targetDateJst: string,
    page: number,
    limit: number,
  ): Promise<Result<DailyDiary, ServerError>> {
    const dbActiveUserId = toDbId(activeUserId)
    const { fromDate, toDateExclusive } = QueryImpl.buildDateRange(targetDateJst, targetDateJst)
    const readAtRangeSql = QueryImpl.buildClosedOpenDateRangeSql(
      'rh.read_at',
      fromDate,
      toDateExclusive,
    )
    const skipAtRangeSql = QueryImpl.buildClosedOpenDateRangeSql(
      'sa.created_at',
      fromDate,
      toDateExclusive,
    )

    // サマリー集計とread一覧を rowKind で判別する1クエリ(1往復)に集約する。
    // D1のdb.batchは生SQL(SQLiteRaw)を扱えないため、UNION ALLで両者を1度に取得する
    const result = await wrapDbCall(() =>
      this.db.all<RawDiaryCombinedRow>(sql`
        SELECT
          'source' as rowKind,
          source_type as sourceType,
          media,
          count,
          NULL as readHistoryId,
          NULL as articleId,
          NULL as title,
          NULL as url,
          NULL as readAt
        FROM (
          SELECT
            'read' as source_type,
            a.media as media,
            COUNT(*) as count
          FROM read_histories rh
          INNER JOIN articles a ON a.article_id = rh.article_id
          WHERE
            rh.active_user_id = ${dbActiveUserId}
            AND ${readAtRangeSql}
          GROUP BY a.media

          UNION ALL

          SELECT
            'skip' as source_type,
            a.media as media,
            COUNT(*) as count
          FROM skipped_articles sa
          INNER JOIN articles a ON a.article_id = sa.article_id
          WHERE
            sa.active_user_id = ${dbActiveUserId}
            AND ${skipAtRangeSql}
          GROUP BY a.media
        ) diary_sources

        UNION ALL

        SELECT
          'read' as rowKind,
          NULL as sourceType,
          media,
          NULL as count,
          readHistoryId,
          articleId,
          title,
          url,
          readAt
        FROM (
          SELECT
            rh.read_history_id as readHistoryId,
            rh.article_id as articleId,
            a.media as media,
            a.title as title,
            a.url as url,
            rh.read_at as readAt
          FROM read_histories rh
          INNER JOIN articles a ON a.article_id = rh.article_id
          WHERE
            rh.active_user_id = ${dbActiveUserId}
            AND ${readAtRangeSql}
          ORDER BY ${QueryImpl.getNormalizedDateTimeSql('rh.read_at')} DESC, rh.read_history_id DESC
          LIMIT ${limit}
          OFFSET ${(page - 1) * limit}
        ) reads_page
      `),
    )
    if (result.isErr()) {
      return err(new ServerError(result.error))
    }

    const { sourceRows, readsRows } = QueryImpl.splitDiaryCombinedRows(result.value)
    const { readRows: readSourcesRows, skipRows: skipSourcesRows } =
      QueryImpl.splitDiarySourceRows(sourceRows)
    const readCount = QueryImpl.sumDiarySourceCounts(readSourcesRows)
    const skipCount = QueryImpl.sumDiarySourceCounts(skipSourcesRows)
    const readsTotal = readCount
    const totalPages = Math.ceil(readsTotal / limit)

    // reads_pageサブクエリのORDER BY順はSQLiteのUNION ALLを通しても保持される
    const reads = readsRows.map(QueryImpl.mapRawDiaryReadItem)

    return ok({
      date: targetDateJst,
      summary: {
        read: readCount,
        skip: skipCount,
      },
      sources: QueryImpl.mergeDiarySources(readSourcesRows, skipSourcesRows),
      reads: {
        data: reads,
        page,
        limit,
        total: readsTotal,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  }

  async getDailyDiaryRange(
    activeUserId: bigint,
    fromDateJst: string,
    toDateJst: string,
  ): Promise<Result<DailyDiaryRangeItem[], ServerError>> {
    const dbActiveUserId = toDbId(activeUserId)
    const { fromDate, toDateExclusive } = QueryImpl.buildDateRange(fromDateJst, toDateJst)
    const readAtRangeSql = QueryImpl.buildClosedOpenDateRangeSql(
      'rh.read_at',
      fromDate,
      toDateExclusive,
    )
    const skipAtRangeSql = QueryImpl.buildClosedOpenDateRangeSql(
      'sa.created_at',
      fromDate,
      toDateExclusive,
    )
    const readAtJstDateSql = QueryImpl.getJstDateSql('rh.read_at')
    const skipAtJstDateSql = QueryImpl.getJstDateSql('sa.created_at')

    const sourceResult = await wrapDbCall(() =>
      this.db.all<RawDiaryDateTypedSourceRow>(sql`
        SELECT
          source_type as sourceType,
          date,
          media,
          count
        FROM (
          SELECT
            'read' as source_type,
            ${readAtJstDateSql} as date,
            a.media as media,
            COUNT(*) as count
          FROM read_histories rh
          INNER JOIN articles a ON a.article_id = rh.article_id
          WHERE
            rh.active_user_id = ${dbActiveUserId}
            AND ${readAtRangeSql}
          GROUP BY ${readAtJstDateSql}, a.media

          UNION ALL

          SELECT
            'skip' as source_type,
            ${skipAtJstDateSql} as date,
            a.media as media,
            COUNT(*) as count
          FROM skipped_articles sa
          INNER JOIN articles a ON a.article_id = sa.article_id
          WHERE
            sa.active_user_id = ${dbActiveUserId}
            AND ${skipAtRangeSql}
          GROUP BY ${skipAtJstDateSql}, a.media
        ) diary_date_sources
      `),
    )
    if (sourceResult.isErr()) {
      return err(new ServerError(sourceResult.error))
    }
    const { readRows: readSourceRows, skipRows: skipSourceRows } =
      QueryImpl.splitDiaryDateSourceRows(sourceResult.value)

    const readByDate = QueryImpl.groupSourcesByDate(readSourceRows)
    const skipByDate = QueryImpl.groupSourcesByDate(skipSourceRows)
    const datesResult = QueryImpl.enumerateJstDateRange(fromDateJst, toDateJst)
    if (datesResult.isErr()) {
      return err(new ServerError(datesResult.error))
    }

    return ok(
      datesResult.value.map((date) => {
        const sources = QueryImpl.mergeDiarySources(
          readByDate.get(date) ?? [],
          skipByDate.get(date) ?? [],
        )
        const summary = sources.reduce(
          (acc, source) => ({
            read: acc.read + source.read,
            skip: acc.skip + source.skip,
          }),
          { read: 0, skip: 0 },
        )
        return { date, summary, sources }
      }),
    )
  }

  private static getNormalizedDateTimeSql(columnName: NormalizedDateTimeColumn) {
    return sql.raw(NORMALIZED_DATETIME_COLUMN[columnName])
  }

  private static getJstDateSql(columnName: NormalizedDateTimeColumn) {
    return sql`date(${QueryImpl.getNormalizedDateTimeSql(columnName)}, '+9 hours')`
  }

  private static buildClosedOpenDateRangeSql(
    columnName: NormalizedDateTimeColumn,
    fromDate: Date,
    toDateExclusive: Date,
  ) {
    const conditions = QueryImpl.buildDateRangeConditions(columnName, { fromDate, toDateExclusive })
    return sql.join(conditions, sql.raw(' AND '))
  }

  private static buildDateRangeConditions(
    columnName: NormalizedDateTimeColumn,
    { fromDate, toDateExclusive }: DateRange,
  ) {
    const normalizedDateTime = QueryImpl.getNormalizedDateTimeSql(columnName)
    const conditions: SQL[] = []
    if (fromDate) {
      conditions.push(sql`${normalizedDateTime} >= datetime(${fromDate.toISOString()})`)
    }
    if (toDateExclusive) {
      conditions.push(sql`${normalizedDateTime} < datetime(${toDateExclusive.toISOString()})`)
    }
    return conditions
  }

  private static buildReadHistoryExistsSql(activeUserId: number) {
    return sql`
      EXISTS (
        SELECT 1
        FROM read_histories rh
        WHERE rh.article_id = articles.article_id
          AND rh.active_user_id = ${activeUserId}
      )
    `
  }

  private static buildIsReadSelectSql(activeUserId?: number) {
    if (activeUserId === undefined) return sql`NULL`
    return QueryImpl.buildReadHistoryExistsSql(activeUserId)
  }

  private static buildReadStatusCondition(readStatus: boolean, activeUserId: number) {
    const readExistsSql = QueryImpl.buildReadHistoryExistsSql(activeUserId)
    return readStatus ? readExistsSql : sql`NOT (${readExistsSql})`
  }

  private static buildSkippedArticleExistsSql(activeUserId: number) {
    return sql`
      EXISTS (
        SELECT 1
        FROM skipped_articles sa
        WHERE sa.article_id = articles.article_id
          AND sa.active_user_id = ${activeUserId}
      )
    `
  }

  private static buildLikeConditionSql(column: string, value: string) {
    const escaped = value.replace(/[%_\\]/g, '\\$&')
    return sql`${sql.raw(column)} LIKE ${`%${escaped}%`} ESCAPE '\\'`
  }

  private static buildSqlWhereClause(params: {
    title?: string
    author?: string
    media?: string
    from?: string
    to?: string
    readStatus?: boolean
    activeUserId?: number
  }) {
    const { title, author, media, from, to, readStatus, activeUserId } = params
    const conditions: SQL[] = []

    if (title) {
      conditions.push(QueryImpl.buildLikeConditionSql('title', title))
    }
    if (author) {
      conditions.push(QueryImpl.buildLikeConditionSql('author', author))
    }
    if (media) {
      conditions.push(sql`media = ${media}`)
    }

    const { fromDate, toDateExclusive } = QueryImpl.buildDateRange(from, to)
    conditions.push(
      ...QueryImpl.buildDateRangeConditions('created_at', { fromDate, toDateExclusive }),
    )

    if (readStatus !== undefined && activeUserId !== undefined) {
      conditions.push(QueryImpl.buildReadStatusCondition(readStatus, activeUserId))
    }

    if (activeUserId !== undefined) {
      conditions.push(sql`NOT (${QueryImpl.buildSkippedArticleExistsSql(activeUserId)})`)
    }

    if (conditions.length === 0) {
      return sql.empty()
    }

    return sql`WHERE ${sql.join(conditions, sql.raw(' AND '))}`
  }

  private static buildDateRange(
    from: string,
    to: string,
  ): {
    fromDate: Date
    toDateExclusive: Date
  }
  private static buildDateRange(from?: string, to?: string): DateRange
  private static buildDateRange(from?: string, to?: string): DateRange {
    const fromDate = from ? toJstDate(from) : undefined
    const toDateExclusive = to ? toJstDate(to) : undefined
    if (toDateExclusive) {
      toDateExclusive.setDate(toDateExclusive.getDate() + 1)
    }
    return { fromDate, toDateExclusive }
  }

  private static mapRawArticleToDomain(row: RawArticleRow): ArticleWithOptionalReadStatus {
    const article = QueryImpl.mapRawArticle(row)

    return {
      ...article,
      isRead: row.isRead === null || row.isRead === undefined ? undefined : Boolean(row.isRead),
    }
  }

  private static mapRawArticle(row: RawArticleRow): Article {
    return {
      articleId: fromDbId(row.articleId),
      media: row.media,
      title: row.title,
      author: row.author,
      description: row.description,
      url: row.url,
      createdAt: normalizeDateTime(row.createdAt),
    }
  }

  private static mapRawDiaryReadItem(row: RawDiaryReadRow): DiaryReadItem {
    return {
      readHistoryId: fromDbId(row.readHistoryId),
      articleId: fromDbId(row.articleId),
      // oxlint-disable-next-line typescript/consistent-type-assertions -- DBのmediaカラムは登録時にArticleMediaへ制約済みのため安全に絞り込めます
      media: row.media as ArticleMedia,
      title: row.title,
      url: row.url,
      readAt: normalizeDateTime(row.readAt),
    }
  }

  private static groupSourcesByDate(rows: RawDiaryDateSourceRow[]) {
    const grouped = new Map<string, RawDiarySourceRow[]>()
    for (const row of rows) {
      const current = grouped.get(row.date) ?? []
      current.push({ media: row.media, count: row.count })
      grouped.set(row.date, current)
    }
    return grouped
  }

  private static splitDiaryCombinedRows(rows: RawDiaryCombinedRow[]) {
    const sourceRows: RawDiaryTypedSourceRow[] = []
    const readsRows: RawDiaryReadRow[] = []

    for (const row of rows) {
      if (row.rowKind === 'source') {
        if (row.sourceType !== null) {
          sourceRows.push({ sourceType: row.sourceType, media: row.media, count: row.count ?? 0 })
        }
      } else if (row.readHistoryId !== null && row.articleId !== null && row.readAt !== null) {
        readsRows.push({
          readHistoryId: row.readHistoryId,
          articleId: row.articleId,
          media: row.media,
          title: row.title ?? '',
          url: row.url ?? '',
          readAt: row.readAt,
        })
      }
    }

    return { sourceRows, readsRows }
  }

  private static splitDiarySourceRows(rows: RawDiaryTypedSourceRow[]) {
    const readRows: RawDiarySourceRow[] = []
    const skipRows: RawDiarySourceRow[] = []

    for (const row of rows) {
      const sourceRow = { media: row.media, count: row.count }
      if (row.sourceType === 'read') {
        readRows.push(sourceRow)
      } else {
        skipRows.push(sourceRow)
      }
    }

    return { readRows, skipRows }
  }

  private static splitDiaryDateSourceRows(rows: RawDiaryDateTypedSourceRow[]) {
    const readRows: RawDiaryDateSourceRow[] = []
    const skipRows: RawDiaryDateSourceRow[] = []

    for (const row of rows) {
      const sourceRow = { date: row.date, media: row.media, count: row.count }
      if (row.sourceType === 'read') {
        readRows.push(sourceRow)
      } else {
        skipRows.push(sourceRow)
      }
    }

    return { readRows, skipRows }
  }

  private static sumDiarySourceCounts(rows: RawDiarySourceRow[]) {
    return rows.reduce((sum, row) => sum + Number(row.count), 0)
  }

  private static mergeDiarySources(readRows: RawDiarySourceRow[], skipRows: RawDiarySourceRow[]) {
    const readMap = new Map<string, number>(readRows.map((row) => [row.media, Number(row.count)]))
    const skipMap = new Map<string, number>(skipRows.map((row) => [row.media, Number(row.count)]))

    return ARTICLE_MEDIA.map((media) => ({
      media,
      read: readMap.get(media) ?? 0,
      skip: skipMap.get(media) ?? 0,
    }))
  }

  private static enumerateJstDateRange(
    fromDateJst: string,
    toDateJst: string,
  ): Result<string[], Error> {
    // 不正なtoDateJstは辞書順比較で常にcurrentより大きく評価され、Date上限到達まで巨大ループになる。
    // 不正なfromDateJstは空配列を正常値として返してしまう。両端を先に検証して両方を防ぐ
    for (const dateJst of [fromDateJst, toDateJst]) {
      if (Number.isNaN(toJstDate(dateJst).getTime())) {
        return err(new Error(`不正な日付文字列です: ${dateJst}`))
      }
    }

    const dates: string[] = []
    let current = fromDateJst
    while (current <= toDateJst) {
      dates.push(current)
      const next = addJstDays(current, 1)
      // 失敗を握り潰すと欠けた日付リストを正常値として返してしまい、日記データが静かに欠落する
      if (next.isErr()) {
        return err(next.error)
      }
      current = next.value
    }
    return ok(dates)
  }
}
