import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

// E2E は本番ハンドラ経路で DB を読むため、dev サーバの miniflare と同じ local D1 を使う。
// dev サーバ起動前にここで migrations を適用し、.wrangler/state/v3 の sqlite を用意する。
// テストプロセス側(getTestRdb)は同じ sqlite へ libsql で直接接続してシードする。
export default function globalSetup(): void {
  execSync('pnpm run d1:apply:local', { cwd: APP_ROOT, stdio: 'inherit' })
}
