import { TEST_DATABASE_URL } from '@/test/env'
import { applyMigrations } from '@/test/setup/apply-migrations'

export default async function globalSetup() {
  await applyMigrations(process.env.DATABASE_URL ?? TEST_DATABASE_URL)
}
