import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPlatformProxy } from 'wrangler'

type D1Database = import('@cloudflare/workers-types').D1Database

type TestD1 = {
  db: D1Database
  dispose: () => Promise<void>
}

// このパッケージ(packages/e2e)から web パッケージ(packages/web)へ辿る。
// wrangler の設定と miniflare の local D1(.wrangler/state) は web パッケージ基準のため、
// 実行時の cwd に依存しないよう絶対パスで明示する。
const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web')

export async function openTestD1(): Promise<TestD1> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: resolve(WEB_ROOT, 'wrangler.toml'),
    // dev サーバー(pnpm dev)が利用する packages/web/.wrangler/state/v3 と同じ DB を参照する
    persist: { path: resolve(WEB_ROOT, '.wrangler/state/v3') },
  })
  if (!proxy.env.DB) {
    await proxy.dispose()
    throw new Error(
      'D1 バインディング "DB" が見つかりません。wrangler.toml の設定を確認してください。',
    )
  }
  return { db: proxy.env.DB, dispose: () => proxy.dispose() }
}
