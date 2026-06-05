// migrations/*.sql を file: SQLite DB に順次適用するスクリプト（prisma db push の代替）。
//
// - 本番 D1 は `wrangler d1 migrations apply` を使うため対象外。
// - ローカル/テスト(file:)向けに wrangler 互換の `d1_migrations` テーブルで
//   適用済みを管理し、未適用ファイルのみを辞書順に適用する（冪等）。
//
// 使い方:
//   DATABASE_URL=file:/abs/path/to/test.db node scripts/apply-migrations.mjs
//
// 仕様:
// - DATABASE_URL は file: 形式必須（@libsql/client のローカルファイル接続）。
// - d1_migrations(id, name, applied_at) は wrangler と同一スキーマ。
//   name には拡張子込みのファイル名（例: 0001_init.sql）を保存する。
// - 各 SQL ファイルは複数ステートメント（トリガー定義含む）を含むため
//   executeMultiple で確実に実行する。
// - 各ファイルはトランザクションで包み、途中失敗時に半適用（d1_migrations 未記録のまま
//   一部 DDL だけ適用済み）が残って再実行不能になるのを防ぐ。
//   ただし PRAGMA を含むファイル（0002 の foreign_keys=OFF/ON）はトランザクション内で
//   PRAGMA が効かない（SQLite はトランザクション中の PRAGMA foreign_keys を無視する）ため、
//   ファイル内容に PRAGMA を含む場合はトランザクションで包まない。
// - 失敗時はどのファイルで失敗したかを stderr に出して非0終了する。
//
// NOTE: ログ出力には process.stdout/stderr.write を使用する。
//   biome の check:fix（--unsafe）が console.* を削除してしまうため。

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = resolve(SCRIPT_DIR, '..', 'migrations')
const MIGRATIONS_TABLE = 'd1_migrations'

// wrangler が生成する d1_migrations と同一スキーマ。
const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE}(
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);`

/** 標準出力に1行書き出す。 */
function logInfo(message) {
  process.stdout.write(`${message}\n`)
}

/** 標準エラー出力に1行書き出す。 */
function logError(message) {
  process.stderr.write(`${message}\n`)
}

/**
 * DATABASE_URL を検証して @libsql/client 用の url を返す。
 * file: 形式のみ許可する。
 */
function resolveDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL
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

/**
 * migrations ディレクトリ内の *.sql ファイル名を辞書順で返す。
 */
function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
}

/**
 * SQL 内容に PRAGMA 文が含まれるかを判定する。
 * PRAGMA を含むファイルはトランザクション内で PRAGMA が効かないため、
 * トランザクションで包まずに適用する。
 */
function containsPragma(sql) {
  return /^\s*PRAGMA\b/im.test(sql)
}

/**
 * 1つのマイグレーションファイルを適用する。
 * PRAGMA を含まないファイルはトランザクションで包み、途中失敗時に半適用が残らないようにする。
 * 途中で失敗した場合、SQLite は executeMultiple のエラーで暗黙にロールバックするが、
 * 念のため明示的に ROLLBACK を試行する（既にロールバック済みなら無視する）。
 */
async function applyMigrationFile(client, sql) {
  if (containsPragma(sql)) {
    // PRAGMA はトランザクション内で無効化されるため、そのまま適用する。
    await client.executeMultiple(sql)
    return
  }

  try {
    await client.executeMultiple(`BEGIN TRANSACTION;\n${sql}\nCOMMIT;`)
  } catch (error) {
    // executeMultiple は失敗時に暗黙ロールバックするが、念のため明示的に試行する。
    try {
      await client.execute('ROLLBACK;')
    } catch {
      // 既にトランザクションが無効（自動ロールバック済み）の場合は無視する。
    }
    throw error
  }
}

async function main() {
  const url = resolveDatabaseUrl()
  const client = createClient({ url })

  try {
    // 適用済み管理テーブルを用意する。
    await client.execute(CREATE_MIGRATIONS_TABLE)

    const appliedResult = await client.execute(`SELECT name FROM ${MIGRATIONS_TABLE};`)
    const appliedNames = new Set(appliedResult.rows.map((row) => row.name))

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
      try {
        // トリガーや複数ステートメントを確実に実行する（PRAGMA 非依存ならトランザクションで包む）。
        await applyMigrationFile(client, sql)
        // 適用済みとして記録する（wrangler 互換で name に拡張子込みファイル名を保存）。
        await client.execute({
          sql: `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?);`,
          args: [name],
        })
        logInfo(`適用しました: ${name}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const pragmaNote = containsPragma(sql)
          ? `\nこのファイルは PRAGMA を含むためトランザクション外で適用されます。部分適用の可能性があります。`
          : ''
        throw new Error(
          `マイグレーション適用に失敗しました: ${name}\n${message}${pragmaNote}\n` +
            `対処: ${name} の DDL が部分適用されている可能性があります。テスト/ローカルDBの場合は ` +
            `DATABASE_URL が指すDBファイルを削除して再実行してください。`,
          {
            cause: error,
          },
        )
      }
    }

    logInfo(`完了: ${unapplied.length} 件のマイグレーションを適用しました`)
  } finally {
    client.close()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  logError(`エラー: ${message}`)
  process.exitCode = 1
})
