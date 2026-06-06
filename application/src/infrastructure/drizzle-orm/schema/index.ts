// ドメイン毎に分割したスキーマを集約するバレル。
// 既存の `@/infrastructure/drizzle-orm/schema` からのimportを変更せずに利用できる。
export * from '@/infrastructure/drizzle-orm/schema/article'
export * from '@/infrastructure/drizzle-orm/schema/datetime'
export * from '@/infrastructure/drizzle-orm/schema/user'
