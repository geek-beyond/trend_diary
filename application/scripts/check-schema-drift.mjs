// Drizzle スキーマと D1 マイグレーション SQL の DDL 等価性を検証する。
// ログは process.stdout/stderr.write を使用（biome の --unsafe fix が console.* を消すため）。

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const APP_DIR = resolve(SCRIPT_DIR, '..')
const APPLY_MIGRATIONS_SCRIPT = join(SCRIPT_DIR, 'apply-migrations.mjs')
const SCHEMA_PATH = './src/infrastructure/drizzle-orm/schema.ts'
// drizzle-kit は bin 直叩き（corepack 前提が無い環境でも動くようにするため）。
const DRIZZLE_KIT_BIN = join(APP_DIR, 'node_modules', '.bin', 'drizzle-kit')

const EXCLUDED_TABLES = new Set(['d1_migrations', 'sqlite_sequence'])

/** 標準出力に1行書き出す。 */
function logInfo(message) {
  process.stdout.write(`${message}\n`)
}

/** 標準エラー出力に1行書き出す。 */
function logError(message) {
  process.stderr.write(`${message}\n`)
}

/** FK 参照先テーブル名の `_new` サフィックスを除去する（0002 のテーブル再作成由来）。 */
function normalizeTableName(name) {
  return name.endsWith('_new') ? name.slice(0, -'_new'.length) : name
}

/** migrations/*.sql を一時 DB に適用する（apply-migrations.mjs を子プロセス実行）。 */
function applyMigrations(dbPath) {
  execFileSync('node', [APPLY_MIGRATIONS_SCRIPT], {
    cwd: APP_DIR,
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: 'pipe',
  })
}

/** drizzle-kit export で schema.ts から DDL を取得する。 */
function exportDrizzleDdl() {
  const output = execFileSync(
    DRIZZLE_KIT_BIN,
    ['export', '--dialect=sqlite', `--schema=${SCHEMA_PATH}`],
    {
      cwd: APP_DIR,
      env: { ...process.env },
      encoding: 'utf8',
    },
  )
  return output
}

/** 比較対象のユーザーテーブル名の一覧を取得する。 */
async function listTables(client) {
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;",
  )
  return result.rows
    .map((row) => String(row.name))
    .filter((name) => !EXCLUDED_TABLES.has(name) && !name.startsWith('sqlite_'))
}

/** 1テーブル分の物理スキーマを PRAGMA で取得し、正規化して返す。 */
async function dumpTable(client, tableName) {
  const columnsResult = await client.execute(`PRAGMA table_info("${tableName}");`)
  // cid は宣言順に依存し本質的でないため除外する。
  const columns = columnsResult.rows
    .map((row) => ({
      name: String(row.name),
      type: String(row.type).toUpperCase(),
      notnull: Number(row.notnull),
      dflt_value: row.dflt_value === null ? null : String(row.dflt_value),
      pk: Number(row.pk),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const foreignKeysResult = await client.execute(`PRAGMA foreign_key_list("${tableName}");`)
  const foreignKeys = foreignKeysResult.rows
    .map((row) => ({
      table: normalizeTableName(String(row.table)),
      from: String(row.from),
      to: String(row.to),
      on_update: String(row.on_update).toUpperCase(),
      on_delete: String(row.on_delete).toUpperCase(),
      match: String(row.match).toUpperCase(),
    }))
    .sort((a, b) => `${a.from}->${a.table}.${a.to}`.localeCompare(`${b.from}->${b.table}.${b.to}`))

  const indexListResult = await client.execute(`PRAGMA index_list("${tableName}");`)
  const indexes = []
  for (const indexRow of indexListResult.rows) {
    const indexName = String(indexRow.name)
    const indexInfoResult = await client.execute(`PRAGMA index_info("${indexName}");`)
    const indexColumns = indexInfoResult.rows
      .sort((a, b) => Number(a.seqno) - Number(b.seqno))
      .map((row) => String(row.name))
    indexes.push({
      name: indexName,
      unique: Number(indexRow.unique),
      origin: String(indexRow.origin),
      partial: Number(indexRow.partial),
      columns: indexColumns,
    })
  }
  indexes.sort((a, b) => a.name.localeCompare(b.name))

  return { columns, foreignKeys, indexes }
}

/** DB 全体の正規化スキーマを取得する。 */
async function dumpSchema(client) {
  const tables = await listTables(client)
  const schema = {}
  for (const tableName of tables) {
    schema[tableName] = await dumpTable(client, tableName)
  }
  return schema
}

/** 2つのスキーマダンプの差分を行配列で返す（空なら一致）。 */
function diffSchemas(migrationsSchema, drizzleSchema) {
  const diffs = []
  const migrationTables = Object.keys(migrationsSchema).sort()
  const drizzleTables = Object.keys(drizzleSchema).sort()

  const onlyInMigrations = migrationTables.filter((t) => !(t in drizzleSchema))
  const onlyInDrizzle = drizzleTables.filter((t) => !(t in migrationsSchema))
  for (const table of onlyInMigrations) {
    diffs.push(`テーブル "${table}" は migrations にのみ存在し、Drizzle スキーマに存在しません`)
  }
  for (const table of onlyInDrizzle) {
    diffs.push(`テーブル "${table}" は Drizzle スキーマにのみ存在し、migrations に存在しません`)
  }

  const commonTables = migrationTables.filter((t) => t in drizzleSchema)
  for (const table of commonTables) {
    const left = JSON.stringify(migrationsSchema[table], null, 2)
    const right = JSON.stringify(drizzleSchema[table], null, 2)
    if (left !== right) {
      diffs.push(`テーブル "${table}" にスキーマ差分があります:`)
      diffs.push(`  [migrations]\n${indent(left, 4)}`)
      diffs.push(`  [drizzle]\n${indent(right, 4)}`)
    }
  }
  return diffs
}

/** 各行に指定スペースのインデントを付ける。 */
function indent(text, spaces) {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => pad + line)
    .join('\n')
}

async function main() {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'schema-drift-'))
  const migrationsDbPath = join(tmpRoot, 'migrations.db')
  const drizzleDbPath = join(tmpRoot, 'drizzle.db')
  let migrationsClient
  let drizzleClient

  try {
    logInfo('migrations/*.sql を一時DBに適用中...')
    applyMigrations(migrationsDbPath)

    logInfo('drizzle-kit export の DDL を一時DBに適用中...')
    const drizzleDdl = exportDrizzleDdl()
    drizzleClient = createClient({ url: `file:${drizzleDbPath}` })
    await drizzleClient.executeMultiple(drizzleDdl)

    logInfo('両DBの物理スキーマを比較中...')
    migrationsClient = createClient({ url: `file:${migrationsDbPath}` })
    const migrationsSchema = await dumpSchema(migrationsClient)
    const drizzleSchema = await dumpSchema(drizzleClient)

    const diffs = diffSchemas(migrationsSchema, drizzleSchema)

    if (diffs.length === 0) {
      logInfo('スキーマドリフトは検出されませんでした（migrations と Drizzle スキーマは一致）')
      return
    }

    logError('スキーマドリフトを検出しました:')
    logError('')
    for (const line of diffs) {
      logError(line)
    }
    logError('')
    logError(
      '対処: schema.ts と migrations/*.sql のどちらかが古い可能性があります。' +
        'schema.ts 編集後は pnpm run db:generate で草案を生成し migrations/ に反映してください。',
    )
    process.exitCode = 1
  } finally {
    migrationsClient?.close()
    drizzleClient?.close()
    rmSync(tmpRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  logError(`エラー: ${message}`)
  process.exitCode = 1
})
