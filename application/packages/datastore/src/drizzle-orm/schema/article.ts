import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { dateTime, normalizedDateTimeExpr } from './datetime'
import { activeUsers } from './user'

export const articles = sqliteTable(
  'articles',
  {
    articleId: integer('article_id').primaryKey({ autoIncrement: true }),
    media: text('media').notNull(),
    title: text('title').notNull(),
    author: text('author').notNull(),
    description: text('description').notNull(),
    url: text('url').notNull(),
    createdAt: dateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    // 混在形式の created_at を正規化した値を保持し、範囲条件にインデックスを効かせる
    createdAtNormalized: text('created_at_normalized').generatedAlwaysAs(
      normalizedDateTimeExpr('created_at'),
      { mode: 'virtual' },
    ),
  },
  (table) => [
    uniqueIndex('articles_url_key').on(table.url),
    index('idx_articles_created_at_normalized').on(table.createdAtNormalized),
  ],
)

export const readHistories = sqliteTable(
  'read_histories',
  {
    readHistoryId: integer('read_history_id').primaryKey({ autoIncrement: true }),
    readAt: dateTime('read_at').notNull(),
    createdAt: dateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    // INFO: 記事IDは外部制約なし（記事削除後も履歴を保持するための意図的設計）
    articleId: integer('article_id').notNull(),
    activeUserId: integer('active_user_id')
      .notNull()
      .references(() => activeUsers.activeUserId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    readAtNormalized: text('read_at_normalized').generatedAlwaysAs(
      normalizedDateTimeExpr('read_at'),
      { mode: 'virtual' },
    ),
  },
  (table) => [
    index('idx_read_histories_article_user').on(table.articleId, table.activeUserId),
    // 日記クエリの active_user_id 絞り込み＋read_at範囲・ソートを1本のインデックスで賄う
    index('idx_read_histories_user_read_at').on(table.activeUserId, table.readAtNormalized),
  ],
)

export const skippedArticles = sqliteTable(
  'skipped_articles',
  {
    skippedArticleId: integer('skipped_article_id').primaryKey({ autoIncrement: true }),
    createdAt: dateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    // INFO: 記事IDは外部制約なし（記事削除後もskip履歴を保持するための意図的設計）
    articleId: integer('article_id').notNull(),
    activeUserId: integer('active_user_id')
      .notNull()
      .references(() => activeUsers.activeUserId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    createdAtNormalized: text('created_at_normalized').generatedAlwaysAs(
      normalizedDateTimeExpr('created_at'),
      { mode: 'virtual' },
    ),
  },
  (table) => [
    uniqueIndex('uq_skipped_articles_article_user').on(table.articleId, table.activeUserId),
    index('idx_skipped_articles_article_user').on(table.articleId, table.activeUserId),
    index('idx_skipped_articles_user_created_at').on(table.activeUserId, table.createdAtNormalized),
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
