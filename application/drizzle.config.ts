import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/infrastructure/drizzle-orm/schema.ts',
  out: './migrations',
})
