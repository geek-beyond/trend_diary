import { disconnectTestRdb } from '@/test/helper/rdb'

export default async function globalSetup() {
  // emulator の起動・ビルドはここでは扱わない。
  // 事前に `cd emulator/supabase && go build -o bin/supabase-emulator . && ./bin/supabase-emulator -addr 127.0.0.1:54321`
  // を別ターミナルで起動しておく前提。

  return async () => {
    await disconnectTestRdb()
  }
}
