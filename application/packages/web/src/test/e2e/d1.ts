import { getPlatformProxy } from 'wrangler'

type D1Database = import('@cloudflare/workers-types').D1Database

type TestD1 = {
  db: D1Database
  dispose: () => Promise<void>
}

export async function openTestD1(): Promise<TestD1> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>()
  return { db: proxy.env.DB, dispose: () => proxy.dispose() }
}
