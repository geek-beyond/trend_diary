import { test as base } from '@playwright/test'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import type { RdbClient } from '@/infrastructure/rdb'
import { createTestMiniflare } from './d1'

type D1Database = import('@cloudflare/workers-types').D1Database

type WorkerFixtures = {
  rdb: RdbClient
}

// dev サーバと同じ local D1 を共有する rdb を worker scope で供給する。
// beforeAll/afterAll でも受け取れるため、シード/クリーンアップから利用する。
export const test = base.extend<Record<never, never>, WorkerFixtures>({
  rdb: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture の第1引数（他fixture未使用）
    async ({}, use) => {
      const mf = createTestMiniflare()
      const db = await mf.getD1Database('DB')
      await use(drizzle(db as unknown as D1Database, { schema }))
      await mf.dispose()
    },
    { scope: 'worker' },
  ],
})

export { expect } from '@playwright/test'
