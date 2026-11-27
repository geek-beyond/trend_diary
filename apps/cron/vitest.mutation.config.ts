import { defineConfig } from 'vitest/config'
import baseConfig from './vitest.config.ts'

export default defineConfig(async () => {
  const config = await baseConfig()
  return {
    ...config,
    test: {
      ...config.test,
      // 変異によるpool再起動がWorkersの初期化と競合しないようにする。
      fileParallelism: false,
      maxWorkers: 1,
    },
  }
})
