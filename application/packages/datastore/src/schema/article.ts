import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { dateTime } from './datetime'
import { activeUsers } from './user'

// 日時カラムは ISO-8601 文字列・CURRENT_TIMESTAMP由来の空白区切りUTC・epochミリ秒(integer) が
// 混在しうる。クエリ側のCASE正規化はインデックスを使えずフルスキャンになるため、
// 同一の正規化を生成列として保持しインデックス対象にする。'now'/'localtime'を含まないため決定的。
function normalizedDateTimeSql(column: string) {
  return sql.raw(
    `CASE WHEN typeof("${column}") = 'integer' THEN datetime("${column}" / 1000, 'unixepoch') ELSE datetime("${column}") END`,
  )
}

export const articles = sqliteTable(
  'articles',
  {
    articleId: integer('article_id').primaryKey({ autoIncrement: true }),
    media: text('media').notNull(),
    title: text('title').notNull(),
    author: text('author').notNull(),
    description: text('description').notNull(),
    url: text('url').notNull(),
    // フィードに画像が無いメディア（Qiita等）や過去記事が存在するため nullable
    imageUrl: text('image_url'),
    createdAt: dateTime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAtNorm: text('created_at_norm').generatedAlwaysAs(normalizedDateTimeSql('created_at'), {
      mode: 'virtual',
    }),
  },
  (table) => [
    uniqueIndex('articles_url_key').on(table.url),
    index('idx_articles_created_at_norm').on(table.createdAtNorm),
  ],
)

export const readHistories = sqliteTable(
  'read_histories',
  {
    readHistoryId: integer('read_history_id').primaryKey({ autoIncrement: true }),
    readAt: dateTime('read_at').notNull(),
    createdAt: dateTime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    // INFO: 記事IDは外部制約なし（記事削除後も履歴を保持するための意図的設計）
    articleId: integer('article_id').notNull(),
    activeUserId: integer('active_user_id')
      .notNull()
      .references(() => activeUsers.activeUserId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    readAtNorm: text('read_at_norm').generatedAlwaysAs(normalizedDateTimeSql('read_at'), {
      mode: 'virtual',
    }),
  },
  (table) => [
    index('idx_read_histories_article_user').on(table.articleId, table.activeUserId),
    // ダイアリー集計は active_user_id 絞り込み＋read_at 範囲のため複合インデックスにする
    index('idx_read_histories_user_read_at_norm').on(table.activeUserId, table.readAtNorm),
  ],
)

export const skippedArticles = sqliteTable(
  'skipped_articles',
  {
    skippedArticleId: integer('skipped_article_id').primaryKey({ autoIncrement: true }),
    createdAt: dateTime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    // INFO: 記事IDは外部制約なし（記事削除後もskip履歴を保持するための意図的設計）
    articleId: integer('article_id').notNull(),
    activeUserId: integer('active_user_id')
      .notNull()
      .references(() => activeUsers.activeUserId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAtNorm: text('created_at_norm').generatedAlwaysAs(normalizedDateTimeSql('created_at'), {
      mode: 'virtual',
    }),
  },
  (table) => [
    uniqueIndex('uq_skipped_articles_article_user').on(table.articleId, table.activeUserId),
    // ダイアリー集計は active_user_id 絞り込み＋created_at 範囲のため複合インデックスにする
    index('idx_skipped_articles_user_created_at_norm').on(table.activeUserId, table.createdAtNorm),
  ],
)

export const readHistoriesRelations = relations(readHistories, ({ one }) => ({
  activeUser: one(activeUsers, {
    fields: [readHistories.activeUserId],
    references: [activeUsers.activeUserId],
  }),
}))

export const skippedArticlesRelations = relations(skippedArticles, ({ one }) => ({
  activeUser: one(activeUsers, {
    fields: [skippedArticles.activeUserId],
    references: [activeUsers.activeUserId],
  }),
}))

export type Article = typeof articles.$inferSelect
