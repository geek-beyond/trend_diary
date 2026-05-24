# Supabase Emulator (Go)

`trend_diary` の結合テスト/ローカル開発向けに、Supabase Auth (GoTrue) 互換のHTTPエンドポイントを提供する軽量Goエミュレータ。`supabase start`（Docker）の代替として、CIや開発機で高速に起動できる。

`emulator/supabase/main.go` がエントリポイントの**シングルバイナリ**。auth以外（storage/realtime）も今後ここに mount する設計。

## ビルドと起動

```bash
cd emulator/supabase
go build -o bin/supabase-emulator .
./bin/supabase-emulator -addr 127.0.0.1:54321
```

## アプリ層の結合テストと組み合わせる

vitest 結合テスト（`npm run test:server`）は emulator の起動・ビルドを**行わない**。事前にこのバイナリを別ターミナルで起動しておくこと。

```bash
# ターミナル1: エミュレータを起動しっぱなしにする
cd emulator/supabase
./bin/supabase-emulator -addr 127.0.0.1:54321

# ターミナル2: 結合テスト
cd application
npm run test:server
```

E2E（`npm run e2e`）だけは Playwright の `webServer` 設定で emulator を自動 build + 起動する。

`application/package.json` には手動ビルド/テスト用のショートカットを用意してある:

- `npm run emulator:build` — Go バイナリをビルド
- `npm run emulator:test` — Go テストを実行

## 実装済みエンドポイント

| Method | Path | 用途 |
|--------|------|------|
| POST | `/auth/v1/signup` | サインアップ（mailer_autoconfirm=true 想定で `AccessTokenResponse` を返す） |
| POST | `/auth/v1/token?grant_type=password` | ログイン |
| POST | `/auth/v1/token?grant_type=refresh_token` | refresh token rotation（reuse_interval 10秒） |
| GET | `/auth/v1/user` | 現在ユーザー取得 |
| POST | `/auth/v1/logout` | ログアウト（refresh token失効） |
| GET | `/auth/v1/admin/users` | 全ユーザー一覧（page / per_page サポート） |
| DELETE | `/auth/v1/admin/users/{id}` | ユーザー削除 |
| GET | `/auth/v1/health` | ヘルスチェック |
| GET | `/auth/v1/settings` | 公開設定 |

### エミュレータ拡張（テスト用）

| Method | Path | 用途 |
|--------|------|------|
| POST | `/__emulator/reset` | 全インメモリStateクリア |
| GET | `/__emulator/snapshot` | users / sessions / refresh_tokens の現状ダンプ |
| POST | `/__emulator/users` | テスト用ユーザの直接シード |

## CLIフラグ / 環境変数

| フラグ | 環境変数 | 既定値 |
|--------|----------|--------|
| `-addr` | `SUPABASE_EMULATOR_ADDR` | `127.0.0.1:54321` |
| `-log-level` | `SUPABASE_EMULATOR_LOG_LEVEL` | `info` |
| `-jwt-secret` | `SUPABASE_EMULATOR_JWT_SECRET` | Supabase CLI 既定値 |
| `-jwt-issuer` | - | `http://127.0.0.1:54321/auth/v1` |
| `-access-token-ttl` | - | `1h` |
| `-refresh-reuse-interval` | - | `10s` |
| `-auth` | `SUPABASE_EMULATOR_REQUIRE_API_KEY` | `false`（kumo流に既定OFF） |
| `-anon-key` | `SUPABASE_EMULATOR_ANON_KEY` | Supabase CLI 既定値 |
| `-service-role-key` | `SUPABASE_EMULATOR_SERVICE_ROLE_KEY` | Supabase CLI 既定値 |

## 設計判断

- **インメモリのみ**: テスト/開発用途のため永続化なし。`/__emulator/reset` で初期化。
- **依存最小**: 標準ライブラリ + `golang.org/x/crypto/bcrypt` のみ。JWTもUUIDも自前実装。
- **HS256固定**: Supabase CLIと同じ秘密鍵を使うので `.dev.vars.example` / `supabase/config.toml` の値変更不要。
- **シングルバイナリ**: storage/realtime を追加するときは `main.go` に Mount を1行足すだけ。

## 未対応機能

- OAuth / Phone / MFA / Email confirmation / Captcha
- メール送信
- DB Hooks / Functions
- Realtime / Storage / Postgrest

## テスト

```bash
go test -race -count=1 ./...
```

または `Makefile` 経由:

```bash
make test-race
```
