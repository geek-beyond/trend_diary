# データベース接続とマイグレーション

## データベース接続時の型取得

- アプリケーション側（バックエンド/API）
  - `@prisma/client` + `@prisma/adapter-d1` を使用

## マイグレーションファイルの生成

Prisma schemaを編集後、ローカル開発DB(SQLite: `dev.db`)に反映する場合:

1. Prisma schemaを編集
2. `pnpm run db:migrate:dev`

`DATABASE_URL`で接続先を指定した環境（例: CIの`test.db`）に反映する場合:

1. Prisma schemaを編集
2. `pnpm run db:migrate`

D1向けSQLを作成・適用する場合:

1. `pnpm run d1:diff:init` （初期作成時）
2. `pnpm run d1:apply:local`
3. 本番は `pnpm run d1:apply:remote`

(参考: https://www.prisma.io/docs/orm/prisma-migrate/getting-started)

## マイグレーション後の作業

1. `pnpm run db:gen` で `@prisma/client` の更新
