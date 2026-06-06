import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import type { RdbClient } from '@/infrastructure/rdb'
import { resolveMiniflareD1Url } from '@/test/setup/miniflare-d1'

let rdb: RdbClient | null = null

// vitest は setupFiles(test-rdb.ts) でテストファイル毎の in-memory SQLite を注入する。
export function setTestRdb(client: RdbClient): void {
  rdb = client
}

export function getTestRdb(): RdbClient {
  if (!rdb) {
    // setupFiles を通らない E2E(Playwright)経路。dev サーバと共有する miniflare local D1
    // (sqlite)へ libsql で直接接続し、本番ハンドラが読む DB と同じ実体にシードする。
    rdb = drizzleLibsql(createClient({ url: resolveMiniflareD1Url() }), { schema })
  }
  return rdb
}
