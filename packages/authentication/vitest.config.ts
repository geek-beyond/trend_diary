import { config } from '@trend-diary/config/vitest'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // 集約前から他パッケージと異なりカバレッジ未計測のため、挙動を変えないよう明示的に無効化する
  test: config({ coverage: false }),
})
