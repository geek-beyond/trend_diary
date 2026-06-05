import { defineConfig } from 'drizzle-kit'

// INFO: out は wrangler(D1) 管理の migrations/ を指定する。
//   drizzle-kit は migrations/meta/_journal.json と最新スナップショットを基準に
//   差分SQLを `${idx 0埋め4桁}_${name}.sql` で migrations/ 直下へ直接生成する。
//   journal の最終エントリ idx=4 のため、次に生成されるファイルは 0005_*.sql となり、
//   既存の本番適用済み 0001〜0004 と連番で整合する。
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/infrastructure/drizzle-orm/schema.ts',
  out: './migrations',
})
