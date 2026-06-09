import { test as base } from '@playwright/test'
import * as schema from '@trend-diary/datastore/drizzle-orm/schema'
import type { RdbClient } from '@trend-diary/datastore/rdb'
import { drizzle } from 'drizzle-orm/d1'
import { openTestD1 } from './d1'

interface WorkerFixtures {
  rdb: RdbClient
}

export const test = base.extend<Record<never, never>, WorkerFixtures>({
  rdb: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture の第1引数（他fixture未使用）
    async ({}, use) => {
      const { db, dispose } = await openTestD1()
      await use(drizzle(db, { schema }))
      await dispose()
    },
    { scope: 'worker' },
  ],
})

export { expect } from '@playwright/test'
