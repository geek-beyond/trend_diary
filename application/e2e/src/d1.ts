import { dirname, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'
import { getPlatformProxy } from 'wrangler'

interface TestD1 {
  db: D1Database
  dispose: () => Promise<void>
}

// webServer(wrangler dev)とこのクライアント(getPlatformProxy)は別プロセスの workerd として
// 同一 SQLite ファイル(.wrangler/state/v3)を共有するため、サーバーの書き込みと重なると
// SQLITE_BUSY で一時的に失敗する。miniflare は busy_timeout を設定できないため、
// クライアント側の再試行でロック解放を待って吸収する。
const BUSY_RETRY_MAX_ATTEMPTS = 5
const BUSY_RETRY_BASE_DELAY_MS = 100

// SQLITE_BUSY は miniflare の D1 エミュレーションを経由すると「internal error」としか報告されない
const RETRYABLE_ERROR_PATTERN = /internal error|SQLITE_BUSY|database is locked/i

// oxlint-disable-next-line typescript/no-restricted-types -- catch で受け取る値は任意の型が throw されうるため、unknown 以外に表現できません
function isBusyError(error: unknown): boolean {
  return error instanceof Error && RETRYABLE_ERROR_PATTERN.test(error.message)
}

async function withBusyRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      if (attempt >= BUSY_RETRY_MAX_ATTEMPTS || !isBusyError(error)) throw error
      await sleep(BUSY_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    }
  }
}

// satisfies で実在する D1 メソッド名であることを強制し、タイポでリトライ対象から漏れるのを防ぐ
const STATEMENT_EXEC_METHODS: ReadonlySet<PropertyKey> = new Set([
  'first',
  'run',
  'all',
  'raw',
] satisfies (keyof D1PreparedStatement)[])

function wrapStatementWithBusyRetry(statement: D1PreparedStatement): D1PreparedStatement {
  return new Proxy(statement, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      const method = value.bind(target)
      // bind は新しいステートメントを返すため、戻り値にも再試行を適用し続ける
      if (prop === 'bind') {
        // oxlint-disable-next-line typescript/no-restricted-types -- 任意のメソッドの引数をそのまま透過的に転送するプロキシのため、引数型を特定できません
        return (...args: unknown[]) => wrapStatementWithBusyRetry(method(...args))
      }
      if (STATEMENT_EXEC_METHODS.has(prop)) {
        // oxlint-disable-next-line typescript/no-restricted-types -- 任意のメソッドの引数をそのまま透過的に転送するプロキシのため、引数型を特定できません
        return (...args: unknown[]) => withBusyRetry(() => method(...args))
      }
      return method
    },
  })
}

const DATABASE_EXEC_METHODS: ReadonlySet<PropertyKey> = new Set([
  'batch',
  'exec',
] satisfies (keyof D1Database)[])

function wrapDbWithBusyRetry(db: D1Database): D1Database {
  return new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      const method = value.bind(target)
      if (prop === 'prepare') {
        // oxlint-disable-next-line typescript/no-restricted-types -- 任意のメソッドの引数をそのまま透過的に転送するプロキシのため、引数型を特定できません
        return (...args: unknown[]) => wrapStatementWithBusyRetry(method(...args))
      }
      if (DATABASE_EXEC_METHODS.has(prop)) {
        // oxlint-disable-next-line typescript/no-restricted-types -- 任意のメソッドの引数をそのまま透過的に転送するプロキシのため、引数型を特定できません
        return (...args: unknown[]) => withBusyRetry(() => method(...args))
      }
      return method
    },
  })
}

// このパッケージ(e2e)から web パッケージ(apps/web)へ辿る。
// wrangler の設定と miniflare の local D1(.wrangler/state) は web パッケージ基準のため、
// 実行時の cwd に依存しないよう絶対パスで明示する。
const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps', 'web')

export async function openTestD1(): Promise<TestD1> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: resolve(WEB_ROOT, 'wrangler.toml'),
    // dev サーバー(pnpm dev)が利用する apps/web/.wrangler/state/v3 と同じ DB を参照する
    persist: { path: resolve(WEB_ROOT, '.wrangler/state/v3') },
  })
  if (!proxy.env.DB) {
    await proxy.dispose()
    throw new Error(
      'D1 バインディング "DB" が見つかりません。wrangler.toml の設定を確認してください。',
    )
  }
  return { db: wrapDbWithBusyRetry(proxy.env.DB), dispose: () => proxy.dispose() }
}
