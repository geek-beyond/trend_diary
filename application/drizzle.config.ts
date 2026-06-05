import { defineConfig } from 'drizzle-kit'

// INFO: 既存の migrations/ は wrangler(D1) 管理のため out には指定しない
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/infrastructure/drizzle-orm/schema.ts',
  out: './drizzle',
})
