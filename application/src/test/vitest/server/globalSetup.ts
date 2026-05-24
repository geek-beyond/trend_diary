import { disconnectTestRdb } from '@/test/helper/rdb'

export default async function globalSetup() {
  // setup処理（現在は特になし）

  // teardown処理を返す
  return async () => {
    await disconnectTestRdb()
  }
}
