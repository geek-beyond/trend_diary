# サインアップ失敗時のSupabase認証ユーザー補償をCloudflare Queuesで行う

Status: Accepted

Relevant PR:

# Context

パスワードサインアップ（`POST /api/registrations`）は次の順で処理している。

1. Supabase `signUp`（anonクライアント）で認証ユーザーを作成する
2. D1に `users` → `active_users` を登録する（`registerActiveUser`）

手順2が失敗した場合、手順1で作成した認証ユーザーを取り消す手段がなく、Supabase側に孤児ユーザーが残る。孤児が残っている間は同じメールアドレスで再サインアップできず、ユーザーは自力で復旧できない。

同期的な補償（認証ユーザーの削除）にはSupabaseの管理者権限（service_role）が必要だが、公開されるサインアップ経路を処理するWorkerにservice_roleを持たせるべきではないため、これまで補償は行わず孤児を許容していた（`apps/web/src/server/registrations/handler/create.ts` のコメント参照）。

なお、OAuth初回ログインでの登録（`oauthCallback`）は対象外とする。登録に失敗しても次回ログイン時に `resolveActiveUser` → 再登録と自己修復する経路であり、認証ユーザーを削除するとプロバイダ連携ごと失われるため、補償としても不適切なため。

前提の変化として、2026-02-04からCloudflare QueuesがWorkers Freeプランで利用可能になった（1日10,000オペレーション、メッセージ保持24時間）。補償メッセージはサインアップ失敗時にしか流れないため、無料枠で十分に収まる。

## References

- [Cloudflare Queues now available on Workers Free plan · Changelog](https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/)
- [Cloudflare Queues docs](https://developers.cloudflare.com/queues/)

# Decision

D1登録失敗時にwebのWorkerが補償メッセージをCloudflare Queuesへ送出し、service_roleを持つ別Worker（`apps/cron`）がコンシューマとして認証ユーザーを削除する。

```
apps/web (producer)                        apps/cron (consumer)
  signUp成功 → D1登録失敗                    queue() ハンドラ
    └→ AUTH_COMPENSATION_QUEUE ──────────→   1. active_users 存在確認（ガード）
        (queue: auth-compensation)           2. auth.admin.deleteUser（冪等）
                                             3. 失敗時 retry → max超過でDLQへ
                                           DLQ (auth-compensation-dlq)
                                             └→ Discord通知（手動対応）
```

- **メッセージスキーマ**: `@trend-diary/domain/account` にZodスキーマとして定義し、producer / consumer が同じスキーマを参照する

  ```ts
  {
    authenticationId: string // Supabase 認証ユーザーID（uuid）
    reason: 'registration_failed'
    requestedAt: string // ISO 8601
  }
  ```

  - メールアドレスは削除に不要なため、PIIをキューへ載せない
- **producer**（`createRegistration` ハンドラ）: `registerActiveUser` が `err` を返したとき、HTTPエラーを返す前にキューへ送出する。送出自体が失敗した場合はerrorログとDiscord通知を出して手動対応へ倒し、クライアントへの応答（元のエラー）は変えない。キュー送出はインフラ関心事のためAPI層（handler）に置き、ドメイン層には持ち込まない
- **consumer**（`apps/cron` の worker に `queue()` ハンドラを追加）:
  1. メッセージをZodで検証する。不正なメッセージはリトライしても解消しないため、Discord通知の上でackする
  2. `authenticationId` に紐づく `active_users` が存在すればackする（at-least-once配送・遅延メッセージによる正規ユーザーの誤削除を防ぐガード）
  3. `auth.admin.deleteUser` を実行する。`user_not_found` は削除済みとして成功扱いにする（冪等）
  4. 失敗時は `message.retry()` し、`max_retries` 超過でDLQへ送る
  5. DLQのconsumerはDiscordへ通知して手動対応に委ねる（Freeプランは保持24時間のため、滞留の検知に頼らず即通知する）
- **service_roleの配置**: `SUPABASE_SERVICE_ROLE_KEY` は `apps/cron` のsecretにのみ設定する。webのWorkerには引き続きバインドしない
- **認証クライアント**: `@trend-diary/authentication` に `deleteUser` のみを公開する本番用の最小クライアントを追加する。既存の `AuthAdminClient` はテスト専用（`NODE_ENV === 'test'` をassert）のため流用しない
- **wrangler設定**: web側に `[[queues.producers]]`、cron側に `[[queues.consumers]]`（`max_retries`・`dead_letter_queue` を明示）を追加する
- **テスト**: producer側は「D1登録失敗でキューへ送出する」「送出失敗でDiscord通知する」、consumer側は「ガードによるスキップ」「`user_not_found` の成功扱い」「失敗時のretry」「DLQ通知」を仕様としてテストコードに記載する（`vitest-pool-workers` のキューサポートを利用する）

## Reason

- リトライ・バックオフ・DLQが標準で付き、producer側はキューのバインディングだけで済むため、service_roleの隔離と即時補償を両立できる。Freeプラン対応によりコスト面の障壁もない
- 検討した代替案
  - 案B: Cloudflare Workflowsでサインアップ全体をサーガ化 → 2ステップ＋補償1つの小規模サーガに耐久実行は過剰。サインアップは同期レスポンスを返すUXであり、非同期前提のWorkflowsとは相性が悪いため不採用
  - 案C: サインアップ経路での同期補償 → webのWorkerにservice_roleを持たせることになるため不採用（従来どおりの判断）
  - 案D: cronによる定期掃除のみ → 実装は最小だが、孤児が掃除されるまで同一メールアドレスで再登録できない時間が残り、即時性でキュー補償に劣る。ただしキュー補償が構造的に救えない失敗（後述）のバックストップとしては有効なため、本ADRの対象外としつつ別イシューで検討を続ける

# Consequences

- D1登録失敗時の孤児認証ユーザーがほぼ即時に削除され、ユーザーは同じメールアドレスですぐ再サインアップできるようになる
- service_roleはコンシューマ（`apps/cron`）のWorkerに閉じ、公開経路のWorkerには載らない
- `apps/cron` はcronトリガーに加えてキューコンシューマも担うようになり、役割が「定期実行」から「非同期ジョブ実行」へ広がる
- 救えない失敗は残る
  - signUp成功からキュー送出までの間にWorkerが落ちた場合、補償メッセージ自体が存在しない
  - Freeプランの保持24時間を超えるコンシューマ障害ではメッセージが失われる（DLQ・Discord通知で検知して手動対応する）
  - これらの完全な解消は案Dの定期掃除（別イシュー）に委ねる
- メッセージスキーマの変更は、保持期間内（最大24時間）の在庫メッセージと互換を保つか、キューを空にしてからデプロイする運用上の注意が生じる
