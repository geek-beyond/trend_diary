import type { RdbClient } from '@trend-diary/datastore/rdb'
import { articles } from '@trend-diary/datastore/schema'
import * as schema from '@trend-diary/datastore/schema'
import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'

export const testRdb: RdbClient = drizzle(env.DB, { schema })

export async function countArticles(): Promise<number> {
  const rows = await testRdb.select({ url: articles.url }).from(articles)
  return rows.length
}

export async function findByUrl(url: string) {
  const [row] = await testRdb.select().from(articles).where(eq(articles.url, url)).limit(1)
  return row
}
