# データベース接続とマイグレーション

## データベース接続時の型取得

- アプリケーション側（バックエンド/API）
  - Drizzle ORM (`drizzle-orm/sqlite-core`) + Cloudflare D1 (SQLite) を使用
  - スキーマの正本は `src/infrastructure/drizzle-orm/schema.ts`
  - 型は `typeof table.$inferSelect` / `typeof table.$inferInsert` で取得する

## スキーマ変更とマイグレーションファイルの生成

スキーマは `schema.ts` を正本とし、D1 への適用は `migrations/*.sql` で行う。
`drizzle-kit` の出力先 `out` は `migrations/` を指している（`drizzle.config.ts`）。
`migrations/meta/`（`_journal.json` と最新スナップショット）をコミットしているため、
`db:generate` は前回スナップショットとの**差分のみ**を `migrations/000N_*.sql` に直接生成する。

1. `src/infrastructure/drizzle-orm/schema.ts` を編集
2. `pnpm run db:generate`（`drizzle-kit generate`）を実行
   - `migrations/meta/` の基準スナップショットと現在の `schema.ts` を比較し、
     差分の `ALTER TABLE ...` 等だけを含む新しい `migrations/000N_*.sql` を**自動採番**で生成する。
   - 同時に `migrations/meta/_journal.json` と `migrations/meta/000N_snapshot.json` が更新される。
   - 既存の本番適用済み `0001`〜`0004` と連番が続くため、次に生成されるファイルは `0005_*.sql` となる。
   - スキーマに差分が無い場合は `No schema changes, nothing to migrate` と表示され何も生成されない。
3. 生成された `migrations/000N_*.sql` の内容を**必ずレビュー**する（意図しない `DROP`/再作成等が
   含まれていないかを確認）。D1 は `migrations/` を辞書順に追記適用するため、既存ファイルの編集・
   リネームは禁止（本番適用済み）。生成された SQL・`meta/` 配下の差分をまとめてコミットする。
4. `pnpm run db:check`（`drizzle-kit check`）で `migrations/meta/_journal.json` とスナップショットの整合を検証する。
   - スキーマと migrations の乖離は「`db:generate` で差分（新規SQL）が出ない」ことで検証する（CI=`db-schema.yaml` が PR 時に generate→`git diff` で実行）。
   - 制約: 手編集した SQL と `schema.ts` の乖離は検出対象外（生成フロー＋レビューで担保する）。

## ローカル/テストDBへの適用

### 自動適用（通常はこちらで完結する）

`migrations/*.sql` の適用は以下の起動・テスト実行時に**自動**で行われるため、
通常は手動で `db:migrate:test` を意識する必要はない。

- `pnpm --filter @trend-diary/e2e run e2e`: Playwright の `globalSetup`（`packages/e2e/src/global-setup.ts`）が `test.db` へ
  自動適用する。`webServer`（`react-router dev`）は readiness が DB 非依存のため、
  globalSetup 完了後にテストの最初のクエリが実行される
- `pnpm run test:server`: vitest の `globalSetup` が `file:` の `DATABASE_URL`
  （既定 `test.db`）へ自動適用してからテストを実行する

いずれも内部で `src/test/setup/apply-migrations.ts` を呼び出しており、冪等（適用済みはスキップ）
なので毎回実行しても安全・高速。なお `apply-migrations.ts` は `file:` の SQLite（test.db）専用の
テスト基盤であり、E2E/テスト経路でのみ使う。

> ローカル dev（`pnpm run start`）は vite cloudflare adapter の miniflare D1（binding: `DB`）を
> 直接使うため、`file:` の自動適用は行わない。dev DB へのマイグレーション適用は下記の
> `pnpm run d1:apply:local` を使う（wrangler と adapter は同じ `.wrangler/state/v3` を共有する）。

### 手動適用（明示的に適用したい場合）

`DATABASE_URL`（`file:`）で接続先を指定した環境（例: CIの`test.db`）に反映する場合:

1. `pnpm run db:migrate:test`（`DATABASE_URL` env で接続先を指定）

> `db:migrate:test` は `src/test/setup/apply-migrations.ts` が `migrations/*.sql` を
> wrangler 互換の `d1_migrations` テーブルで冪等に適用する（適用済みはスキップ）。

## D1（Cloudflare）への適用

1. ローカル dev: `pnpm run d1:apply:local`（`wrangler d1 migrations apply trend-diary-db --local`）。
   `pnpm run start` の miniflare D1 と同じ `.wrangler/state/v3` に適用されるため、dev サーバーから参照できる。
2. 本番: `pnpm run d1:apply:remote`（`wrangler d1 migrations apply trend-diary-db --remote`、CDで自動実行）

## スキーマドリフトの検証

drizzle-kit 標準機構で検証する。CI（`db-schema.yaml`）が PR 時に以下を実行する。

1. `pnpm run db:generate` を実行し、`git diff --exit-code -- migrations` で
   新規 SQL・`meta/` 差分が出ない（＝ドリフトなし）ことを確認する。
2. `pnpm run db:check`（`drizzle-kit check`）で `meta/_journal.json` とスナップショットの整合を検証する。

ローカルでも上記をそのまま実行して同じ検証ができる（`db:check` 単体は journal 整合のみ）。

> 制約: 手編集した `migrations/*.sql` と `schema.ts` の乖離は検出対象外。
> 生成フロー（`db:generate`）＋ SQL レビューで担保する。
