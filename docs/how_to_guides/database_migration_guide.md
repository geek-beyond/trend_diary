# データベース接続とマイグレーション

## データベース接続時の型取得

- アプリケーション側（バックエンド/API）
  - Drizzle ORM (`drizzle-orm/sqlite-core`) + Cloudflare D1 (SQLite) を使用
  - スキーマの正本は `packages/datastore/src/drizzle-orm/schema/`
  - 型は `typeof table.$inferSelect` / `typeof table.$inferInsert` で取得する

## スキーマ変更とマイグレーションファイルの生成

スキーマは `packages/datastore/src/drizzle-orm/schema/` を正本とし、D1 への適用は
`packages/datastore/migrations/*.sql` で行います。`drizzle-kit` の出力先 `out` は
`migrations/` を指しています（`packages/datastore/drizzle.config.ts`。以降の相対パスは
`packages/datastore/` 基準）。`migrations/meta/`（`_journal.json` と最新スナップショット）を
コミットしているため、`db:generate` は前回スナップショットとの**差分のみ**を
`migrations/000N_*.sql` に直接生成します。

1. `packages/datastore/src/drizzle-orm/schema/` を編集
2. `pnpm --filter @trend-diary/datastore db:generate`（`drizzle-kit generate`）を実行
   - `migrations/meta/` の基準スナップショットと現在の `schema.ts` を比較し、
     差分の `ALTER TABLE ...` 等だけを含む新しい `migrations/000N_*.sql` を**自動採番**で生成します。
   - 同時に `migrations/meta/_journal.json` と `migrations/meta/000N_snapshot.json` が更新されます。
   - スキーマに差分が無い場合は `No schema changes, nothing to migrate` と表示され何も生成されません。
3. 生成された `migrations/000N_*.sql` の内容を**必ずレビュー**してください（意図しない `DROP`/再作成等が
   含まれていないかを確認）。D1 は `migrations/` を辞書順に追記適用するため、既存ファイルの編集・
   リネームは禁止です（本番適用済み）。生成された SQL・`meta/` 配下の差分をまとめてコミットします。
4. `pnpm --filter @trend-diary/datastore db:check`（`drizzle-kit check`）で `migrations/meta/_journal.json` とスナップショットの整合を検証します。
   - スキーマと migrations の乖離は「`db:generate` で差分（新規SQL）が出ない」ことで検証します（CI=`ci.yaml` の `schema` ジョブが PR 時に generate→`git diff` で実行）。
   - 制約: 手編集した SQL と `schema.ts` の乖離は検出対象外です（生成フロー＋レビューで担保します）。

## ローカル/テストDBへの適用

`migrations/*.sql` の適用は各テストの起動時に**自動**で行われるため、通常は手動適用を
意識する必要はありません。適用先はいずれも miniflare の D1（binding: `DB`）であり、
`file:` 接続の SQLite ファイル（`test.db` 等）は使用しません。

- **サーバー結合テスト** `pnpm --filter @trend-diary/web test --project server`
  - setup ファイル `apps/web/src/test/setup/d1.ts` が `packages/datastore/migrations` を
    `readD1Migrations` で読み込み、`getPlatformProxy`（`persist: false`）の**インメモリ D1**へ適用します。
  - プロセスごとに新規の DB が立ち上がるため、冪等管理は不要です。
- **E2Eテスト** `pnpm --filter @trend-diary/e2e test`
  - Playwright の `globalSetup`（`e2e/src/global-setup.ts`）が
    `apps/web/.wrangler/state/v3` の**miniflare local D1** へ適用します。
  - `d1_migrations` テーブルで適用済みを管理する冪等な適用のため、毎回実行しても安全です。
  - `webServer` は `pnpm build && pnpm exec wrangler dev --port 5173`（cwd は `apps/web`）で
    ビルド済みワーカーを配信します（baseURL: `http://localhost:5173`）。global-setup と
    `wrangler dev` は同じ `.wrangler/state/v3` を共有します。

> ローカル dev（`pnpm dev`）も vite cloudflare adapter の miniflare D1（`.wrangler/state/v3`、binding: `DB`）を
> 使います。dev DB へマイグレーションを適用する場合は下記の `d1:apply:local` を使ってください
> （`wrangler dev` と adapter は同じ `.wrangler/state/v3` を共有します）。

## D1（Cloudflare）への適用

1. ローカル dev: `pnpm --filter @trend-diary/web d1:apply:local`（`wrangler d1 migrations apply trend-diary-db --local`）。
   `pnpm dev` の miniflare D1 と同じ `.wrangler/state/v3` に適用されるため、dev サーバーから参照できます。
2. 本番: CD（`cd.yaml`）が `wrangler d1 migrations apply trend-diary-db --remote` を自動実行します
   （`cloudflare/wrangler-action`、working-directory は `apps/web`）。pnpm script としては提供していません。

## スキーマドリフトの検証

drizzle-kit 標準機構で検証します。CI（`ci.yaml` の `schema` ジョブ）が PR 時に以下を実行します。

1. `pnpm --filter @trend-diary/datastore db:generate` を実行し、
   `git add -N packages/datastore/migrations` の後に
   `git diff --exit-code -- packages/datastore/migrations` で
   新規 SQL・`meta/` 差分が出ない（＝ドリフトなし）ことを確認します。
2. `pnpm --filter @trend-diary/datastore db:check`（`drizzle-kit check`）で `meta/_journal.json` とスナップショットの整合を検証します。

ローカルでもリポジトリルートで上記をそのまま実行すれば同じ検証ができます
（`git` のパス指定は CI の `working-directory: .` と同じくリポジトリルート基準です。
`db:check` 単体は journal 整合のみ）。

> 制約: 手編集した `migrations/*.sql` と `schema.ts` の乖離は検出対象外です。
> 生成フロー（`db:generate`）＋ SQL レビューで担保します。
