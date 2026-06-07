# CI / CD 全体構成

pnpm ワークスペース分離（親イシュー #685）に伴い、CI / CD は「変更されたパッケージ単位でのみ実行する」方針で構成している。背景の設計判断は [pnpm ワークスペース分離の設計判断](/docs/adr/20260607_pnpmワークスペース分離の設計判断.md) を参照。

## 方針

- **パッケージ単位実行**: パッケージを切り出す各イシューで、そのパッケージ専用の CI（テスト / 型チェック / lint 等）も必ず分離して追加する。本リポジトリの CI は「全部まとめて 1 ジョブ」ではなく、パッケージ / デプロイ単位のジョブに分かれている。
- **変更検知**: PR では変更があったパッケージのみテストを実行し、CI 時間を抑える。`main` への push 時はリグレッションとして全テストを実行する。

## ワークフロー一覧

| ワークフロー | ファイル | 役割 | トリガ |
| --- | --- | --- | --- |
| Lint | `.github/workflows/lint.yaml` | Biome CI・全パッケージ型チェック（`pnpm -r typecheck`）・web ビルド | push |
| Test | `.github/workflows/test.yaml` | web（client/server/component）と共有パッケージ（common/datastore/domain/notification）のテスト | main への push / PR |
| Cron Test | `.github/workflows/cron-test.yaml` | cron パッケージの型チェック・テスト | main への push / PR |
| E2E | `.github/workflows/e2e.yaml` | Playwright による E2E | main への push / PR |
| Check Schema Drift | `.github/workflows/db-schema.yaml` | Drizzle スキーマとマイグレーションの整合検証 | PR |
| CD | `.github/workflows/cd.yaml` | web デプロイ・D1 マイグレーション適用 | Test 成功後 / 手動 |
| Cron Deploy | `.github/workflows/cron-deploy.yaml` | cron worker デプロイ | Cron Test 成功後 |

## 変更検知の仕組み

変更検知には 2 つの方式を使い分けている。

1. **`paths` フィルタ（ワークフロー単位）**
   `cron-test.yaml` / `e2e.yaml` / `db-schema.yaml` は、`on.pull_request.paths` に対象パッケージと依存パッケージのパスを列挙し、関係ない変更ではワークフロー自体を起動しない。

   例（cron）: cron 本体に加え、cron が依存する `common` / `datastore` / `domain` / `notification`、共通の `package.json` / `pnpm-lock.yaml` / マイグレーションを監視する。

2. **`diff` アクション（ジョブ単位）**
   `test.yaml` は `setup` ジョブで [`./.github/actions/diff`](/.github/actions/diff/action.yaml) を使い、ベースブランチとの差分ファイル数を領域ごと（client / server / packages / storybook / テスト設定）に数える。差分があった領域のジョブだけを後続で実行する。

   - PR: 変更があった領域のみ実行。
   - `main` への push: 全領域を実行（リグレッション）。
   - テスト設定ファイル（`test.yaml` 自体や Vitest 設定）に変更があった場合は、影響範囲が読めないため全テストを実行。

共有パッケージ（common/datastore/domain/notification）のテストは `test.yaml` の `package` ジョブで matrix 化している。同質（node + vitest だけで完結する）パッケージが増えたら `matrix.package` に追加する。server（Supabase 必要）・cron（miniflare 必要）・component（Playwright 必要）など特殊な環境が要るものは専用ジョブのまま分けている。

## デプロイ構成

web / cron はそれぞれ独立した Cloudflare Workers としてデプロイされ、各パッケージの `wrangler.toml` を持つ。

- **web**: `application/packages/web/wrangler.toml`（worker 名 `trend-diary`）。`CD` ワークフローが `Test` 成功後にビルド → `wrangler deploy` する。D1 マイグレーションも同ワークフローで適用する。
- **cron**: `application/packages/cron/wrangler.toml`（worker 名 `trend-diary-cron`、`crons = ["0 */1 * * *"]`）。`Cron Deploy` ワークフローが `Cron Test` 成功後に `wrangler deploy` する。

両者とも同一の D1 データベース（`trend-diary-db`）を共有し、マイグレーションは `datastore` パッケージ（`../datastore/migrations`）を正本として参照する。

### デプロイ確認（dry-run）

ワークスペース構成でデプロイが成立することは、`wrangler deploy --dry-run` で検証できる。

```sh
# cron（React 非依存。ビルド不要）
pnpm --filter @trend-diary/cron exec wrangler deploy --dry-run

# web（先にビルドが必要）
pnpm run build
pnpm --filter @trend-diary/web exec wrangler deploy --dry-run
```
