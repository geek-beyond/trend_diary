import { coverageConfig } from '@trend-diary/vitest-config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    watch: false,
    coverage: coverageConfig({
      exclude: [
        // D1 を要する薄い factory で、単体では計測に不向き。cron の統合テストで担保する
        'src/rdb/client.ts',
        // drizzle のテーブル定義は宣言的で実行分岐を持たないため計測対象外とする
        'src/schema/article.ts',
        'src/schema/user.ts',
      ],
    }),
  },
})
