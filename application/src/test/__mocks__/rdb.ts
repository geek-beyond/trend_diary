import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy'
import { beforeEach, vi } from 'vitest'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import type { RdbClient } from '@/infrastructure/rdb'

/**
 * Drizzle の SQL 実行をモックするための executor。
 *
 * `drizzle-orm/sqlite-proxy` の RemoteCallback として動作し、Drizzle が組み立てた
 * SQL文・パラメータ・実行メソッド（'run' | 'all' | 'values' | 'get'）を引数に受け取る。
 * 戻り値の形は sqlite-proxy の仕様に従い `{ rows: unknown[] }` で固定。
 *
 * テストからは:
 * - 戻り行を `executor.mockResolvedValue({ rows: [...] })` で差し込む
 * - 呼ばれたSQL/パラメータを `expect(executor).toHaveBeenCalledWith(sql, params, method)` で検証する
 *
 * ## 注入する `rows` の形は実行経路で異なる（重要）
 *
 * sqlite-proxy は経路ごとに `rows` の扱いが違うため、注入形を合わせる必要がある:
 *
 * 1. クエリビルダ（`db.select().from(...)` / `insert ... returning` など）
 *    → Drizzle が `method='values'` で実行し、`rows` の各要素を「カラム順の配列」
 *      （values タプル）として解釈し、SELECT したカラム順にマッピングする。
 *      よって戻り行は **配列** で注入する。
 *
 * 2. 生SQL（`db.all(sql\`...\`)`）
 *    → sqlite-proxy は注入した `rows` を **無変換で透過** する。実ドライバ（libsql/D1）は
 *      `db.all` でカラム名（SQLの別名）をキーにした **オブジェクト** を返すため、
 *      モックでも **オブジェクト（カラム/別名キー）** で注入する。配列で注入すると
 *      呼び出し側が `row.xxx` でアクセスする際に `undefined` になる。
 *      ※ SQLで `as articleId` のように別名を付けている場合、キーもその別名に合わせる。
 *
 * @example クエリビルダ（配列で注入）
 * ```ts
 * import { vi } from 'vitest'
 * vi.mock('@/infrastructure/rdb')
 * import getRdbClient from '@/infrastructure/rdb'
 * import { mockRdbExecutor } from '@/test/__mocks__/rdb'
 *
 * test('articles を1件返す', async () => {
 *   // article_id, media, title, author, description, url, created_at の順に配列で返す
 *   mockRdbExecutor.mockResolvedValue({
 *     rows: [[1, 'qiita', 'タイトル', '著者', '説明', 'https://example.com', '2024-01-01T00:00:00.000Z']],
 *   })
 *
 *   const db = getRdbClient('file::memory:') // モック化されているのでURLは無視される
 *   const result = await db.select().from(articles)
 *
 *   expect(result[0].title).toBe('タイトル')
 *   expect(mockRdbExecutor).toHaveBeenCalled()
 *   const [sql, params, method] = mockRdbExecutor.mock.calls[0]
 *   expect(sql).toContain('select')
 * })
 * ```
 *
 * @example 生SQL `db.all(sql\`...\`)`（カラム/別名キーのオブジェクトで注入）
 * ```ts
 * import { sql } from 'drizzle-orm'
 *
 * test('集計件数を返す', async () => {
 *   // SELECT count(*) as total ... の別名 total をキーにしたオブジェクトで注入する
 *   mockRdbExecutor.mockResolvedValue({ rows: [{ total: 2 }] })
 *
 *   const db = getRdbClient('file::memory:')
 *   const rows = await db.all<{ total: number }>(sql`select count(*) as total from articles`)
 *
 *   expect(rows[0].total).toBe(2)
 * })
 * ```
 */
export const mockRdbExecutor =
  vi.fn<
    (
      sql: string,
      params: unknown[],
      method: 'run' | 'all' | 'values' | 'get',
    ) => Promise<{ rows: unknown[] }>
  >()

/**
 * モック用の Drizzle インスタンス（sqlite-proxy ドライバ）。
 *
 * `RdbClient`（= libsql/D1 共通の `BaseSQLiteDatabase<'async', unknown, typeof schema>`）
 * として代入可能なため、本番コードと同じ型でクエリビルダ・リレーショナルクエリを呼べる。
 */
const mockDb: RdbClient = drizzleProxy(
  (sql, params, method) => mockRdbExecutor(sql, params, method),
  { schema },
)

/**
 * `vi.mock('@/infrastructure/rdb')` の差し替え先となる `getRdbClient` のモック。
 * 入力（URL/D1バインディング）に関わらず常にモックDBを返す。
 */
const getRdbClient = vi.fn(
  (_input: string | { db?: unknown; databaseUrl?: string }): RdbClient => mockDb,
)

export default getRdbClient

/**
 * `closeRdbClient` のモック（no-op）。本番同様に `RdbClient` を受け取るシグネチャを維持する。
 */
export const closeRdbClient = vi.fn((_db: RdbClient): void => {
  // no-op: モックでは接続クローズは何もしない
})

// INFO: テストごとにモック状態をリセットする(既存 __mocks__/prisma.ts の mockReset 方式を踏襲)
beforeEach(() => {
  mockRdbExecutor.mockReset()
  getRdbClient.mockClear()
  closeRdbClient.mockClear()
  // 既定では空行を返し、未設定時にエラーで落ちないようにする
  mockRdbExecutor.mockResolvedValue({ rows: [] })
})
