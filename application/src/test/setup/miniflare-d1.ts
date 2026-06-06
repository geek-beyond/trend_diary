import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..')

// dev サーバ(@hono/vite-dev-server/cloudflare → getPlatformProxy)も
// `wrangler d1 migrations apply --local` も既定で .wrangler/state/v3 を共有する。
// その local D1 の実体 sqlite を libsql から直接開いて E2E のシード/検証に使う。
const D1_STATE_DIR = join(APP_ROOT, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject')

// 実体の D1 は DO 名前空間のハッシュ(64桁hex)を名前に持つ。同ディレクトリには wrangler の
// メタデータ(metadata.sqlite)も同居するため、ハッシュ名のファイルだけを対象にする。
const D1_SQLITE_PATTERN = /^[0-9a-f]{64}\.sqlite$/

// miniflare local D1 の sqlite ファイル(file: URL)を返す。E2E では事前に
// `pnpm run d1:apply:local` で生成・マイグレーション済みである前提。
export function resolveMiniflareD1Url(): string {
  let sqliteFiles: string[]
  try {
    sqliteFiles = readdirSync(D1_STATE_DIR).filter((name) => D1_SQLITE_PATTERN.test(name))
  } catch {
    throw new Error(
      `miniflare local D1 が見つかりません（${D1_STATE_DIR}）。先に pnpm run d1:apply:local を実行してください`,
    )
  }

  if (sqliteFiles.length !== 1) {
    throw new Error(
      `miniflare local D1 の sqlite を一意に特定できません（${sqliteFiles.length} 件）。.wrangler/state を初期化してから再実行してください`,
    )
  }

  return `file:${join(D1_STATE_DIR, sqliteFiles[0])}`
}
