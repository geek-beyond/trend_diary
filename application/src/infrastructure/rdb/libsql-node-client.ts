import type { Client as LibSQLClient, Config as LibSQLConfig } from '@libsql/client'

const isWorkerd = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

// file:(libsql)を使うのはテスト系のみで、それらは常に DATABASE_URL を供給する。dev/本番(D1)は
// DATABASE_URL 未設定のため、未設定時は import せずネイティブモジュール(libsql)のロードを避ける。
export const createLibSQLNodeClient: ((config: LibSQLConfig) => LibSQLClient) | null =
  isWorkerd || !process.env.DATABASE_URL?.trim()
    ? null
    : (await import('@libsql/client/node')).createClient
