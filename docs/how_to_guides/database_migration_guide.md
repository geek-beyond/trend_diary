# データベース接続とマイグレーション

## データベース接続時の型取得

- アプリケーション側（バックエンド/API）
  - Drizzle ORM (`drizzle-orm/sqlite-core`) + Cloudflare D1 (SQLite) を使用
  - スキーマの正本は `src/infrastructure/drizzle-orm/schema.ts`
  - 型は `typeof table.$inferSelect` / `typeof table.$inferInsert` で取得する

## スキーマ変更とマイグレーションファイルの生成

スキーマは `schema.ts` を正本とし、D1 への適用は `migrations/*.sql` で行う。

1. `src/infrastructure/drizzle-orm/schema.ts` を編集
2. `pnpm run db:generate`（`drizzle-kit generate`）でマイグレーションSQLの草案を生成
   - 出力先 `out: './drizzle'` は `.gitignore` 対象（コミットしない）。新規チェックアウトでは
     基準スナップショットが存在しないため、生成物は**差分ではなく全スキーマのDDL草案**になる。
3. 生成物は全スキーマDDLの草案として扱い、`migrations/000N_*.sql` へ配置する際は
   **既存の適用済みマイグレーションとの差分を手動で抽出**して、新しい変更分のみを記載する
   （D1 は `migrations/` を辞書順に追記適用するため、既存ファイルは編集せず新規番号で追加する）。
4. `pnpm run db:check` で `schema.ts` と `migrations/*.sql` のDDL等価性（整合）を検証する。

## ローカル/テストDBへの適用

ローカル開発DB(SQLite: `dev.db`)に反映する場合:

1. `pnpm run db:migrate:dev`

`DATABASE_URL`で接続先を指定した環境（例: CIの`test.db`）に反映する場合:

1. `pnpm run db:migrate`

> `db:migrate` 系は `scripts/apply-migrations.mjs` が `migrations/*.sql` を
> wrangler 互換の `d1_migrations` テーブルで冪等に適用する（適用済みはスキップ）。

## D1（Cloudflare）への適用

1. ローカル: `pnpm run d1:apply:local`（`wrangler d1 migrations apply trend-diary-db --local`）
2. 本番: `pnpm run d1:apply:remote`（`wrangler d1 migrations apply trend-diary-db --remote`、CDで自動実行）

## スキーマドリフトの検証

`pnpm run db:check`（`scripts/check-schema-drift.mjs`）は、`schema.ts` から
`drizzle-kit export` で生成したDDLと、`migrations/*.sql` を適用した物理スキーマを
PRAGMA で比較し、両者の差分（ドリフト）を検出する。CIでは `drizzle.yaml` が
PR時に同チェックを実行する。
