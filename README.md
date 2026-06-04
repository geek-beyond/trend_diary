[![Lint](https://github.com/geek-beyond/trend_diary/actions/workflows/lint.yaml/badge.svg)](https://github.com/geek-beyond/trend_diary/actions/workflows/lint.yaml)
[![Test](https://github.com/geek-beyond/trend_diary/actions/workflows/test.yaml/badge.svg?branch=main)](https://github.com/geek-beyond/trend_diary/actions/workflows/test.yaml)
[![CD](https://github.com/geek-beyond/trend_diary/actions/workflows/cd.yaml/badge.svg)](https://github.com/geek-beyond/trend_diary/actions/workflows/cd.yaml)

## 環境構築

### 必要なもの

- ローカルでのNodeの実行環境
- パッケージマネージャーにpnpmを使用（`corepack enable`で有効化、バージョンは`package.json`の`packageManager`に従う）
- Docker実行環境（Macの場合はOrbStack推奨）

### 手順

pnpmの有効化（初回のみ）

```sh
corepack enable
```

Nodeモジュールのインストール

```sh
pnpm install --frozen-lockfile
```

Prismaクライアントの生成

```sh
pnpm run setup
```

Supabaseを起動（Auth用途）

```sh
supabase start
```

環境変数ファイルをコピー(Cloudflareでは.{env}.vars)
`supabase start`時に表示される`anon key`を`SUPABASE_ANON_KEY`に設定
```sh
cp .dev.vars.example .dev.vars
```

ローカル開発用DB(SQLite: `dev.db`)にマイグレーションを適用

```sh
pnpm run db:migrate:dev
```

`DATABASE_URL`を指定した環境（例: CIの`test.db`）に適用する場合は`pnpm run db:migrate`を使う

Cloudflare D1ローカルマイグレーション適用（必要な場合）

```sh
pnpm run d1:apply:local
```

サーバの起動（Hono上でAPIとRemixが起動する）

```sh
pnpm start
```

## 他ドキュメント

[ホーム](docs/home.md)

## リファレンス

- [React Router](https://reactrouter.com/home)
- [React Router Hono Adapter](https://github.com/yusukebe/hono-react-router-adapter)
- [Hono](https://hono.dev/docs/)
- [TailwindCSS Using Vite](https://tailwindcss.com/docs/installation/using-vite)
