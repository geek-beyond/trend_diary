import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import type { RdbClient } from '@/infrastructure/rdb'

type D1Database = import('@cloudflare/workers-types').D1Database

// テスト用の D1 バインディングを実行コンテキスト毎の setup で注入する。
// - vitest(server/cron): pool-workers の setup(workers-d1.ts)が cloudflare:test の env.DB を注入
// - E2E(Playwright): e2e-rdb.ts が getPlatformProxy().env.DB を注入
// RdbClient は D1 から確定的に導出できるため、D1 を単一の真実として保持する。
let d1: D1Database | null = null
let rdb: RdbClient | null = null

export function setTestD1(db: D1Database): void {
  d1 = db
  rdb = null
}

export function getTestD1(): D1Database {
  if (!d1) {
    throw new Error(
      'テスト用 D1 バインディングが未初期化です（vitest は setupFiles=workers-d1.ts、E2E は beforeAll で initE2ETestRdb を呼び出してください）',
    )
  }
  return d1
}

export function getTestRdb(): RdbClient {
  rdb ??= drizzle(getTestD1(), { schema })
  return rdb
}
