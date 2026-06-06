import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { dateTime } from '@/infrastructure/drizzle-orm/schema/datetime'
import { activeUsers } from '@/infrastructure/drizzle-orm/schema/user'

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
  },
  (table) => [uniqueIndex('articles_url_key').on(table.url)],
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
  },
  (table) => [index('idx_read_histories_article_user').on(table.articleId, table.activeUserId)],
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
  },
  (table) => [
    uniqueIndex('uq_skipped_articles_article_user').on(table.articleId, table.activeUserId),
    index('idx_skipped_articles_article_user').on(table.articleId, table.activeUserId),
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
