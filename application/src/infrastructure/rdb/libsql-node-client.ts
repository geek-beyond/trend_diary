import type { Client as LibSQLClient, Config as LibSQLConfig } from '@libsql/client'

/**
 * `@libsql/client/node`（`file:`/リモートlibsql対応のNodeビルド）を生成する関数。
 *
 * Nodeビルドはネイティブモジュール `libsql` に依存し、モジュール評価時に
 * `requireNative` を実行する。これを静的importでバンドルに含めると、
 * Workersランタイム（workerd）の起動時にネイティブ読み込みが走り起動に失敗する。
 *
 * 一方で本番Workers（D1バインディング経路）では `file:` 分岐自体が実行されないため、
 * Nodeクライアントは不要。そこで「workerd以外（Node系: vite dev SSR/vitest/wrangler未起動の
 * Node実行）でのみ動的importする」ことで、workerdバンドルに `libsql` を含めず評価も走らせない。
 *
 * 判定は Cloudflare Workers が公開する `navigator.userAgent === 'Cloudflare-Workers'` の
 * 厳密一致で行う。Node 22 も `navigator`（userAgent は `Node.js/<major>`）を持つため、
 * 厳密一致でなければ誤検知する。
 *
 * @see https://github.com/libsql/libsql-client-ts#supported-urls
 */
const isWorkerd = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

// file:(libsql)を使うのはテスト系のみで、それらは常に DATABASE_URL を供給する。dev/本番(D1)は
// DATABASE_URL 未設定のため、未設定時は import せずネイティブモジュール(libsql)のロードを避ける。
export const createLibSQLNodeClient: ((config: LibSQLConfig) => LibSQLClient) | null =
  isWorkerd || !process.env.DATABASE_URL?.trim()
    ? null
    : (await import('@libsql/client/node')).createClient
