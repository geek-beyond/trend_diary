import { drizzle } from 'drizzle-orm/d1'
import { getPlatformProxy } from 'wrangler'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import { setTestD1, setTestRdb } from '@/test/helper/rdb'

type D1Database = import('@cloudflare/workers-types').D1Database
type ProxyEnv = { DB: D1Database }

// E2E(Playwright)用の RdbClient 初期化。dev サーバ(@hono/vite-dev-server/cloudflare)と同じ
// getPlatformProxy(=.wrangler/state/v3 を共有する miniflare local D1)へ接続し、本番ハンドラが
// 読む DB と同一実体へ drizzle-orm/d1 でシードする。先に global-setup が d1:apply:local 済み。
let proxy: Awaited<ReturnType<typeof getPlatformProxy<ProxyEnv>>> | null = null

export async function initE2ETestRdb(): Promise<void> {
  if (proxy) return
  proxy = await getPlatformProxy<ProxyEnv>()
  const db = proxy.env.DB
  setTestD1(db)
  setTestRdb(drizzle(db, { schema }))
}

export async function disposeE2ETestRdb(): Promise<void> {
  await proxy?.dispose()
  proxy = null
}
