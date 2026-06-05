import getRdbClient, { closeRdbClient, type RdbClient } from '@/infrastructure/rdb'
import TEST_ENV from '@/test/env'

// テスト環境であることを明示
process.env.NODE_ENV = 'test'

let rdb: RdbClient | null = null

export function getTestRdb(): RdbClient {
  if (!rdb) {
    rdb = getRdbClient(TEST_ENV.DATABASE_URL)
  }
  return rdb
}

export function disconnectTestRdb(): void {
  if (rdb) {
    closeRdbClient(rdb)
    rdb = null
  }
}
