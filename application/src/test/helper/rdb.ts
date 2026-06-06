import type { RdbClient } from '@/infrastructure/rdb'

type D1Database = import('@cloudflare/workers-types').D1Database

// テスト用の D1 バインディングと RdbClient は、実行コンテキスト毎の setup で注入する。
// - vitest(server/cron): pool-workers の setup(workers-d1.ts)が cloudflare:test の env.DB を注入
// - E2E(Playwright): e2e-rdb.ts が getPlatformProxy().env.DB を注入
// 本モジュールは libsql/node:fs を一切 import しないため、workerd バンドルでも安全に読み込める。
let rdb: RdbClient | null = null
let d1: D1Database | null = null

export function setTestD1(db: D1Database): void {
  d1 = db
}

export function getTestD1(): D1Database {
  if (!d1) {
    throw new Error(
      'テスト用 D1 バインディングが未初期化です（setup で setTestD1 を呼び出してください）',
    )
  }
  return d1
}

export function setTestRdb(client: RdbClient): void {
  rdb = client
}

export function getTestRdb(): RdbClient {
  if (!rdb) {
    throw new Error(
      'テスト用 RdbClient が未初期化です（vitest は setupFiles=workers-d1.ts、E2E は beforeAll で initE2ETestRdb を呼び出してください）',
    )
  }
  return rdb
}
