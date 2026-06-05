import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy'
import { beforeEach, vi } from 'vitest'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import type { RdbClient } from '@/infrastructure/rdb'

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

const mockDb: RdbClient = drizzleProxy(
  (sql, params, method) => mockRdbExecutor(sql, params, method),
  { schema },
)

const getRdbClient = vi.fn(
  (_input: string | { db?: unknown; databaseUrl?: string }): RdbClient => mockDb,
)

export default getRdbClient

beforeEach(() => {
  mockRdbExecutor.mockReset()
  getRdbClient.mockClear()
  mockRdbExecutor.mockResolvedValue({ rows: [] })
})
