# APIレートリミット設定

認証系エンドポイントへのブルートフォース攻撃・大量サインアップ試行を抑止するため、アプリ側でレートリミットを導入している。

## 仕組み

Cloudflare Workers の [Rate Limiting バインディング](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) を利用する。エッジで動作し追加コストは発生しない。

- バインディング定義: `apps/web/wrangler.toml` の `[[ratelimits]]`（`AUTH_RATE_LIMITER`）
- ミドルウェア: `apps/web/src/middleware/rate-limiter.ts`
- 適用先: `POST /api/auth/login` / `POST /api/auth/signup`

## 制限値

`wrangler.toml` の `simple = { limit = 10, period = 60 }` で設定する。

- `limit`: 期間内に許可するリクエスト数
- `period`: 期間（秒。`10` または `60` のみ指定可）

IPアドレス（`CF-Connecting-IP`）とパスの組み合わせをキーとし、login / signup を独立してカウントする。制限を超えると `429 Too Many Requests` を返す。

## 注意点

- バインディング未設定の環境（ローカル開発など）や、Rate Limiting API 自体が障害で例外を返した場合は、認証を止めないよう制限をスキップ（フェイルオープン）する。本番では `wrangler.toml` で常にバインディングが設定される。
- Workers Rate Limiting はデータセンター単位のカウントのため、グローバルに厳密な総量制限ではない。ブルートフォース抑止を主目的とする。
- Supabase Auth (GoTrue) 側にもデフォルトのレート制限が存在するため、多層で防御している。

## 関連

- Issue #739（本機能の導入）
- Issue #735（運用ドキュメント整備）
