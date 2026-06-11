import type { D1Database } from '@cloudflare/workers-types'
import * as schema from '@trend-diary/datastore/drizzle-orm/schema'
import type { RdbClient } from '@trend-diary/datastore/rdb'
import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy'
import { beforeEach, vi } from 'vitest'

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

// 本番型(DrizzleD1Database)とドライバが異なるため、テスト側でキャストして吸収する
// （クエリビルダ API は共通のため実行時は問題なく動作する）。
const mockDbProxy = drizzleProxy((sql, params, method) => mockRdbExecutor(sql, params, method), {
  schema,
})
// oxlint-disable-next-line typescript/consistent-type-assertions -- 本番型(DrizzleD1Database)とsqlite-proxyドライバは型が異なり、テスト用に吸収する手段が他にないためです
const mockDb = mockDbProxy as unknown as RdbClient

const getRdbClient = vi.fn((_db?: D1Database): RdbClient => mockDb)

export default getRdbClient

beforeEach(() => {
  mockRdbExecutor.mockReset()
  getRdbClient.mockClear()
  mockRdbExecutor.mockResolvedValue({ rows: [] })
})
