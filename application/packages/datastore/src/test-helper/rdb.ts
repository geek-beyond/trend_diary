import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy'
import { beforeEach, vi } from 'vitest'
import * as schema from '../drizzle-orm/schema'
import type { RdbClient } from '../rdb'

// Drizzle のクエリ実行を差し替えるモック executor。
// 注入する `rows` の形は実行経路で異なる（重要なgotcha）:
// - クエリビルダ（select / insert returning）: Drizzle が「カラム順の配列」として
//   解釈するため、戻り行は配列で注入する。
// - 生SQL（db.all）: sqlite-proxy は rows を無変換で透過し、実ドライバはカラム名（別名）を
//   キーにしたオブジェクトを返すため、別名キーのオブジェクトで注入する（配列だと undefined）。
export const mockRdbExecutor =
  vi.fn<
    (
      sql: string,
      params: unknown[],
      method: 'run' | 'all' | 'values' | 'get',
    ) => Promise<{ rows: unknown[] }>
  >()

// 本番は DrizzleD1Database だがクエリビルダ API は共通のため、sqlite-proxy でモックする
// （実行時は問題なく動作する）。
export const mockRdbClient = drizzleProxy(
  (sql, params, method) => mockRdbExecutor(sql, params, method),
  { schema },
) as unknown as RdbClient

type D1Database = import('@cloudflare/workers-types').D1Database

// getRdbClient(env.DB) を差し替えたい呼び出し側向け（DIせずに内部生成するコード用）
export const getRdbClientMock = vi.fn((_db?: D1Database): RdbClient => mockRdbClient)

beforeEach(() => {
  mockRdbExecutor.mockReset()
  getRdbClientMock.mockClear()
  mockRdbExecutor.mockResolvedValue({ rows: [] })
})

export default getRdbClientMock
