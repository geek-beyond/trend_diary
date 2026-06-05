import { relations, sql } from 'drizzle-orm'
import { customType, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * ドライバが返す日時値を `Date` へ正規化する。
 *
 * 既存D1本番データには、Prismaが書き込んだISO-8601文字列
 * ("2025-01-01T00:00:00.000Z") と、DEFAULT CURRENT_TIMESTAMP由来の
 * "YYYY-MM-DD HH:MM:SS"（UTC）形式が混在しうる。さらに過去のデータでは
 * epochミリ秒(integer)が格納されている可能性もある（生SQL経路では bigint で返りうる）。
 *
 * - number / bigint: epochミリ秒として解釈する。
 * - タイムゾーン付き文字列(ISO-8601): そのまま `Date` で解釈する。
 * - "YYYY-MM-DD HH:MM:SS"(CURRENT_TIMESTAMP由来のUTC): Tを補い末尾Zを付けてUTCとして解釈する。
 *
 * クエリビルダ経路(customType.fromDriver)と生SQL経路(db.all)の両方で
 * 同一の正規化を共有し、ローカル/devなど非UTC環境でも返る `Date` がずれないようにする。
 *
 * @see src/domain/article/infrastructure/query-impl.ts の getNormalizedDateTimeSql()
 */
export function normalizePrismaDateTime(value: string | number | bigint): Date {
  if (typeof value === 'number' || typeof value === 'bigint') {
    return new Date(Number(value))
  }
  const hasTimezone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(value)
  if (!hasTimezone && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(`${value.replace(' ', 'T')}Z`)
  }
  return new Date(value)
}

/**
 * Prisma互換のDateTimeカラム型。
 *
 * - 読み込み: `normalizePrismaDateTime` でいずれの形式の値も `Date` に正規化する。
 * - 書き込み: Prismaと同じISO-8601形式の文字列で書き込む。
 */
const prismaDateTime = customType<{
  data: Date
  driverData: string | number
}>({
  dataType() {
    return 'DATETIME'
  },
  toDriver(value: Date): string {
    return value.toISOString()
  },
  fromDriver(value: string | number): Date {
    return normalizePrismaDateTime(value)
  },
})

export const users = sqliteTable('users', {
  userId: integer('user_id').primaryKey({ autoIncrement: true }),
  createdAt: prismaDateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const activeUsers = sqliteTable(
  'active_users',
  {
    activeUserId: integer('active_user_id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    displayName: text('display_name'),
    authenticationId: text('authentication_id'),
    createdAt: prismaDateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: prismaDateTime('updated_at').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
  },
  (table) => [
    uniqueIndex('active_users_email_key').on(table.email),
    uniqueIndex('active_users_authentication_id_key').on(table.authenticationId),
    uniqueIndex('active_users_user_id_key').on(table.userId),
  ],
)

export const articles = sqliteTable(
  'articles',
  {
    articleId: integer('article_id').primaryKey({ autoIncrement: true }),
    media: text('media').notNull(),
    title: text('title').notNull(),
    author: text('author').notNull(),
    description: text('description').notNull(),
    url: text('url').notNull(),
    createdAt: prismaDateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex('articles_url_key').on(table.url)],
)

export const bannedUsers = sqliteTable(
  'banned_users',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    bannedAt: prismaDateTime('banned_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    reason: text('reason'),
    createdAt: prismaDateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex('banned_users_user_id_key').on(table.userId)],
)

export const leavedUsers = sqliteTable(
  'leaved_users',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    reason: text('reason'),
    createdAt: prismaDateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex('leaved_users_user_id_key').on(table.userId)],
)

export const readHistories = sqliteTable(
  'read_histories',
  {
    readHistoryId: integer('read_history_id').primaryKey({ autoIncrement: true }),
    readAt: prismaDateTime('read_at').notNull(),
    createdAt: prismaDateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
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
    createdAt: prismaDateTime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
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

export const usersRelations = relations(users, ({ one }) => ({
  activeUser: one(activeUsers, {
    fields: [users.userId],
    references: [activeUsers.userId],
  }),
  bannedUser: one(bannedUsers, {
    fields: [users.userId],
    references: [bannedUsers.userId],
  }),
  leavedUser: one(leavedUsers, {
    fields: [users.userId],
    references: [leavedUsers.userId],
  }),
}))

export const activeUsersRelations = relations(activeUsers, ({ one, many }) => ({
  user: one(users, {
    fields: [activeUsers.userId],
    references: [users.userId],
  }),
  readHistories: many(readHistories),
  skippedArticles: many(skippedArticles),
}))

export const bannedUsersRelations = relations(bannedUsers, ({ one }) => ({
  user: one(users, {
    fields: [bannedUsers.userId],
    references: [users.userId],
  }),
}))

export const leavedUsersRelations = relations(leavedUsers, ({ one }) => ({
  user: one(users, {
    fields: [leavedUsers.userId],
    references: [users.userId],
  }),
}))

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

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type ActiveUser = typeof activeUsers.$inferSelect
export type NewActiveUser = typeof activeUsers.$inferInsert
export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
export type BannedUser = typeof bannedUsers.$inferSelect
export type NewBannedUser = typeof bannedUsers.$inferInsert
export type LeavedUser = typeof leavedUsers.$inferSelect
export type NewLeavedUser = typeof leavedUsers.$inferInsert
export type ReadHistory = typeof readHistories.$inferSelect
export type NewReadHistory = typeof readHistories.$inferInsert
export type SkippedArticle = typeof skippedArticles.$inferSelect
export type NewSkippedArticle = typeof skippedArticles.$inferInsert
