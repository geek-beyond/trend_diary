import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import { createLibSQLNodeClient } from '@/infrastructure/rdb/libsql-node-client'
import { resolveLogger } from '@/infrastructure/rdb/logger'

type D1Database = import('@cloudflare/workers-types').D1Database

type RdbConfig = {
  db?: D1Database
  databaseUrl?: string
}

type RdbInput = string | RdbConfig

// libsql / D1 / sqlite-proxy(テスト) は結果セット型のみ異なるため、結果セット型を
// unknown にした共通基底型を RdbClient として扱う。
export type RdbClient = BaseSQLiteDatabase<'async', unknown, typeof schema>

export default function getRdbClient(input: RdbInput): RdbClient {
  const isTest = process.env.NODE_ENV === 'test'
  const config: RdbConfig = typeof input === 'string' ? { databaseUrl: input } : input
  const databaseUrl = config.databaseUrl?.trim() || process.env.DATABASE_URL?.trim()

  const logger = resolveLogger(isTest)

  // INFO: file:(libsql)はD1より優先する。E2EではviteアダプタがD1バインディングも供給するため、
  //       優先しないと test.db への分離が壊れる
  if (databaseUrl?.startsWith('file:')) {
    // INFO: `file:`はNodeビルド(`@libsql/client/node`)でのみ対応。workerd(本番)では実行されない経路。
    //       Node実行でも DATABASE_URL 未設定だとクライアント未ロードのため、その旨も案内する
    if (!createLibSQLNodeClient) {
      throw new Error(
        'file: database URL requires the Node libsql client, which is only loaded when DATABASE_URL is set (not available on the Workers runtime)',
      )
    }
    return drizzleLibsql(createLibSQLNodeClient({ url: databaseUrl }), { schema, logger })
  }

  if (config.db) {
    return drizzleD1(config.db, { schema, logger })
  }

  if (!databaseUrl) {
    throw new Error('Either D1 binding (db) or databaseUrl must be provided')
  }

  // INFO: file: 以外のURL(リモートlibsql等)もlibsqlドライバで接続する。
  // Nodeビルドが使えない環境(workerd)では到達し得ない経路のため、Nodeクライアントを利用する
  if (!createLibSQLNodeClient) {
    throw new Error('Remote libsql database URL is not supported on the Workers runtime')
  }
  return drizzleLibsql(createLibSQLNodeClient({ url: databaseUrl }), { schema, logger })
}
