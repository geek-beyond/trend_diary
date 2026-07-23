import { relations, sql } from 'drizzle-orm'
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { readHistories, skippedArticles } from './article'
import { dateTime } from './datetime'

export const users = sqliteTable('users', {
  userId: integer('user_id').primaryKey({ autoIncrement: true }),
  createdAt: dateTime('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const activeUsers = sqliteTable(
  'active_users',
  {
    activeUserId: integer('active_user_id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    displayName: text('display_name'),
    authenticationId: text('authentication_id').notNull(),
    createdAt: dateTime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: dateTime('updated_at').notNull(),
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

export const bannedUsers = sqliteTable(
  'banned_users',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade', onUpdate: 'cascade' }),
    bannedAt: dateTime('banned_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    reason: text('reason'),
    createdAt: dateTime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
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
    createdAt: dateTime('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex('leaved_users_user_id_key').on(table.userId)],
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

export type ActiveUser = typeof activeUsers.$inferSelect
