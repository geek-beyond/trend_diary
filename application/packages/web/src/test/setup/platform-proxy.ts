import { fileURLToPath } from 'node:url'
import type { D1Database } from '@cloudflare/workers-types'
import { getPlatformProxy } from 'wrangler'

interface TestPlatformBindings {
  DB: D1Database
}

// wrangler の getPlatformProxy で miniflare 由来の D1（本番ローカルと同じ SQLite エンジン）を
// Node ランタイム上に供給する。これにより server テストを workerd 上で動かす必要がなくなり、
// カバレッジ provider を v8 に統一できる。
// persist:false でテストプロセスごとにインメモリの独立した D1 になる。
const proxy = await getPlatformProxy<TestPlatformBindings>({
  configPath: fileURLToPath(new URL('../../../wrangler.toml', import.meta.url)),
  persist: false,
})

export const platformEnv = proxy.env
export const disposePlatformProxy = proxy.dispose
