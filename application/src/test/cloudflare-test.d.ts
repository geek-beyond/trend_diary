/// <reference types="@cloudflare/vitest-pool-workers/types" />
import type { D1Migration } from '@cloudflare/vitest-pool-workers'

// pool-workers の miniflare bindings(server/cron config)で供給する値の型。
// cloudflare:test の `env` は Cloudflare.Env 型のため、その名前空間を拡張する。
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database
      TEST_MIGRATIONS: D1Migration[]
      NODE_ENV: string
      LOG_LEVEL: string
    }
  }
}
