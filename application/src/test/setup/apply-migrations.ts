// DATABASE_URL は file: 形式が必須（libsql Node クライアントでのみ動作する）。
// PRAGMA を含むファイルはトランザクション内で PRAGMA が効かないため tx 外で適用する。
// ログは process.stdout/stderr.write を使用（biome の --unsafe fix が console.* を消すため）。

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Client, createClient, type Value } from '@libsql/client'

const MIGRATIONS_DIR = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', 'migrations')
const MIGRATIONS_TABLE = 'd1_migrations'

const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE}(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`

function logInfo(message: string): void {
  process.stdout.write(`${message}\n`)
}

function assertFileDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 環境変数が設定されていません（file: 形式が必要です）')
  }
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(
      `DATABASE_URL は file: 形式である必要があります（受け取った値: ${databaseUrl}）`,
    )
  }
  return databaseUrl
}

function listMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
}

function containsPragma(sql: string): boolean {
  return /^\s*PRAGMA\b/im.test(sql)
}

// PRAGMA は tx 内で効かないため tx 外で適用する。それ以外は tx で包み半適用を防ぐ。
// 失敗時は接続クローズ時に未コミット tx が自動ロールバックされる。
async function applyMigrationFile(client: Client, sql: string): Promise<void> {
  if (containsPragma(sql)) {
    await client.executeMultiple(sql)
    return
  }
  await client.executeMultiple(`BEGIN TRANSACTION;\n${sql}\nCOMMIT;`)
}

export async function applyMigrations(databaseUrl: string | undefined): Promise<void> {
  const url = assertFileDatabaseUrl(databaseUrl)
  const client = createClient({ url })

  try {
    await client.execute(CREATE_MIGRATIONS_TABLE)

    const appliedResult = await client.execute(`SELECT name FROM ${MIGRATIONS_TABLE};`)
    const appliedNames = new Set<Value>(appliedResult.rows.map((row) => row.name))

    const allMigrations = listMigrationFiles()
    const unapplied = allMigrations.filter((name) => !appliedNames.has(name))

    if (unapplied.length === 0) {
      logInfo('適用すべきマイグレーションはありません（全て適用済み）')
      return
    }

    logInfo(`適用対象のマイグレーション: ${unapplied.length} 件`)
    for (const name of unapplied) {
      logInfo(`  - ${name}`)
    }

    for (const name of unapplied) {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8')
      await applyMigrationFile(client, sql)
      await client.execute({
        sql: `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?);`,
        args: [name],
      })
      logInfo(`適用しました: ${name}`)
    }

    logInfo(`完了: ${unapplied.length} 件のマイグレーションを適用しました`)
  } finally {
    client.close()
  }
}

// import 時に自動実行しないよう、CLI 直接実行のときだけ DATABASE_URL env を解決して適用する。
// vitest / playwright の globalSetup として直接指定するエントリ。
// env.ts は @/ エイリアスを含み CLI(strip-types)では解決できないため遅延 import する。
export default async function globalSetup(): Promise<void> {
  const { TEST_DATABASE_URL } = await import('../env')
  await applyMigrations(process.env.DATABASE_URL ?? TEST_DATABASE_URL)
}

const isCliEntry = process.argv[1] === fileURLToPath(import.meta.url)
if (isCliEntry) {
  await applyMigrations(process.env.DATABASE_URL?.trim())
}
