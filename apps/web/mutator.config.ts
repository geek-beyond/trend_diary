export default {
  // mutation 対応済みの client テストが実行するソースに限定する
  include: ['src/client/**/*.{ts,tsx}'],
  vitestConfig: 'vitest.mutation.config.ts',
}
