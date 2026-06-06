import type { RdbClient } from '@/infrastructure/rdb'

let rdb: RdbClient | null = null

export function setTestRdb(client: RdbClient): void {
  rdb = client
}

export function getTestRdb(): RdbClient {
  if (!rdb) {
    throw new Error(
      'テスト用 RdbClient が未初期化です。vitest config の setupFiles に src/test/setup/test-rdb.ts を設定してください',
    )
  }
  return rdb
}
