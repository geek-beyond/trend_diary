import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/drizzle-orm/schema/index.ts',
  out: './migrations',
})
