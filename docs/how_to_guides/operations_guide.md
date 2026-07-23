# 運用ガイド（ログ・監視・復旧）

本番運用に必要なログレベル方針・監視の確認先・アラート経路・DB 復旧手順をまとめる。インシデント発生時の一次対応の起点として参照する。

## ログレベル方針

構造化ログには Pino ベースの共通ロガー（`packages/logger/src/logger.ts`）を使用する。レベルは `trace` / `debug` / `info` / `warn` / `error` / `fatal` / `silent` を取りうる。

### 方針

- **本番（production）= `info`** を既定とする。
  - `debug` 以下にはクエリログ（`packages/datastore/src/rdb/logger.ts`）が含まれ、`params` に email 等の PII が混入し得る。常時出力すると情報漏えい・ログ肥大につながるため、本番では出力させない。
  - 調査時に一時的に詳細を見たい場合のみ `debug` / `trace` を明示的に指定する。
- テスト実行時はノイズを抑えるため `silent` を使う。

### 設定箇所

| 環境 | 設定箇所 | 値 |
| --- | --- | --- |
| 本番 web | `apps/web/wrangler.toml` の `[vars]` | `LOG_LEVEL = "info"` |
| 本番 cron | `apps/cron/wrangler.toml` の `[vars]` | `LOG_LEVEL = "info"` |
| ローカル | `apps/web/.dev.vars`（`.dev.vars.example` 参照） | 未設定なら `info` |
| テスト | 各テストヘルパーの env | `silent` |

未設定でも各実行経路（`request-logger.ts` / `rdb/logger.ts` / `error-handler.ts`）が `info` へフォールバックするため、本番が誤って `debug` で稼働する事故は起きにくい。`wrangler.toml` での明示は「本番は info」という方針をコードと設定の両方で担保するためのもの。

## 監視・メトリクス

### Cloudflare Workers Observability

web / cron いずれの `wrangler.toml` でも Observability を有効化している（`[observability] enabled = true`, `head_sampling_rate = 1` で全リクエストをサンプリング）。Pino が標準出力へ出した構造化ログはここに集約される。

- 確認先: Cloudflare ダッシュボード → Workers & Pages → 対象 Worker（`trend-diary` / `trend-diary-cron`）→ **Observability / Logs**。
- 構造化ログは `msg` をキーにしており、`request_id`・`method`・`path`・`status`・`response_time` 等のフィールドで絞り込み・検索ができる。リクエスト単位の追跡には `request_id` を使う。

### メトリクス・Analytics

- Worker の起動数・エラー率・CPU 時間などは同ダッシュボードの **Metrics** で確認する。
- D1 のクエリ数・読み書き行数・レイテンシは Workers & Pages → D1 → `trend-diary-db` の **Metrics** で確認する。
- cron の実行履歴は対象 Worker の **Cron Triggers / Logs** で確認する（スケジュールは `0 */1 * * *`、毎時実行）。

## アラート経路（Discord）

5xx エラーやデプロイ後ヘルスチェック失敗を Discord Webhook へ通知する。

### 通知の種類と発火元

- **アプリの 5xx / 未捕捉エラー**: `apps/web/src/middleware/error-handler.ts` が `DiscordNotifier`（`packages/notification/src/discord.ts`）でエラーメッセージ・リクエスト情報・スタックトレースを embed 送信する。
- **cron ジョブのエラー**: `apps/cron/src/worker.ts` が `DiscordWebhookClient` で通知する。
- **デプロイ後のヘルスチェック失敗**: CD（`.github/workflows/cd.yaml`）の web デプロイ後スモークテストが失敗すると、ワークフローが直接 Discord へ通知する。

通知送信はリトライ（429 / 5xx のみ、指数バックオフ）し、恒久エラー（401/404 等）は即時打ち切る。通知の失敗は本処理に影響させず、ログに記録するのみ。Webhook URL 未設定時は警告ログを出して送信をスキップする（無音で障害を見逃さないため）。

### シークレット管理

`DISCORD_WEBHOOK_URL` は秘匿情報のため `wrangler.toml` には記載しない。

- **本番**: GitHub Actions のリポジトリ Secrets（`DISCORD_WEBHOOK_URL`）として保管し、CD（`cd.yaml`）の `wrangler-action` の `secrets:` 経由で各 Worker の Secret に注入する。`SUPABASE_ANON_KEY` も同様に Secret 管理。
- **ローカル**: `apps/web/.dev.vars` に記載する（`.dev.vars.example` を参照。`.dev.vars` は Git 管理外）。
- ローテーション時は Discord 側で Webhook を再発行し、GitHub Secrets を更新して再デプロイする。

## DB 復旧手順

D1（SQLite）の `wrangler d1 migrations apply` は**前進のみ**で、down マイグレーションを持たない。マイグレーションファイル（`packages/datastore/migrations/*.sql`）は本番適用済みのため、編集・リネーム・削除は禁止（`database_migration_guide.md` 参照）。復旧は以下の方針で行う。

### 1. スキーマ／データ破壊を伴う不具合の場合: Time Travel で復元

D1 の Time Travel で過去 30 日以内の任意時点へ復元できる。

1. 直前のブックマークを確認: `wrangler d1 time-travel info trend-diary-db`
2. タイムスタンプまたはブックマークを指定して復元:
   `wrangler d1 time-travel restore trend-diary-db --timestamp=<ISO8601>`
   （または `--bookmark=<bookmark>`）
3. 復元は破壊的操作のため、対象時点・影響範囲を確認してから実行する。実行前に現在の状態のブックマークも控えておく。

### 2. ロジック上の誤りを前進で修正する場合: 修正マイグレーションを追加

down で巻き戻すのではなく、誤りを打ち消す新しいマイグレーションを追加して前進で直す。

1. `packages/datastore/src/drizzle-orm/schema/` を修正
2. `pnpm --filter @trend-diary/datastore db:generate` で新規 `000N_*.sql` を生成しレビュー
3. 本番適用は CD の `database` ジョブ（`cd.yaml`、`wrangler d1 migrations apply trend-diary-db --remote`）で行う。手動適用が必要な場合は同コマンドを実行する。

### 3. アプリ／cron の不具合の場合: 直前の正常版へロールバック

DB 変更を伴わないコード起因の障害は、Worker を直前の正常デプロイへ戻す。

- Cloudflare ダッシュボードの対象 Worker → **Deployments** から直前のバージョンへロールバックする（即時反映）。
- もしくは正常だったコミットを `main` に戻して CD を再実行する。

## 関連

- [データベース接続とマイグレーション](database_migration_guide.md)
- [APIレートリミット設定](rate_limit_setup.md)
- Issue #735（本ドキュメントの整備）
