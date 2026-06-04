# 推奨コマンド一覧

## 開発サーバー

### アプリケーション起動
```bash
pnpm start
```
- React Routerで開発サーバーを起動
- 内部でSupabaseも自動起動（prestart/poststart）

### ビルド
```bash
pnpm run build
```
- 本番用ビルド生成

## テスト

### 全テストタイプ
```bash
# ドメイン層のテスト（モックPrismaクライアント使用）
pnpm run test:domain

# API層のテスト（実際のデータベース使用）
pnpm run test:api

# フロントエンドのテスト（コンポーネント・フック）
pnpm run test:client

# Storybookのテスト（UIコンポーネントのビジュアルテスト）
pnpm run test-storybook

# E2Eテスト（Playwright）
pnpm run e2e

# E2Eテストレポート表示
pnpm run e2e:report

# E2Eテストコード生成
pnpm run e2e:gen
```

## データベース

### マイグレーション
```bash
# 開発用マイグレーション実行
pnpm run db:migrate

# SQLのみのマイグレーション（シードなし）
pnpm run db:migrate:sql-only

# 本番用マイグレーション適用
pnpm run db:deploy
```

### リセット・シード
```bash
# データベースリセット
pnpm run db:reset

# シードデータ投入
pnpm run db:seed
```

### Supabase型生成
```bash
pnpm run supabase:db:type-gen
```

## コード品質

### Lint・フォーマット
```bash
# Biome CI + TypeScript型チェック（推奨）
pnpm run lint

# TypeScript型チェックのみ
pnpm run typecheck

# Biomeチェック
pnpm run check

# Biome自動修正（--unsafe含む）
pnpm run check:fix
```

## Supabase

### Supabase起動・停止
```bash
# Supabase起動（一部サービス除外）
pnpm run supabase:start

# Supabase停止（pnpm startのpoststart内で自動実行）
supabase stop

# Supabaseステータス確認
supabase status
```

## Storybook

```bash
# Storybookサーバー起動
pnpm run storybook
```

## インストール

```bash
# パッケージインストール（postinstall内でprisma generate実行）
pnpm install --frozen-lockfile
```

## よく使うワークフロー

### 新機能開発時
1. `pnpm start` - 開発サーバー起動
2. コード編集
3. `pnpm run lint` - Lint + 型チェック
4. 該当層のテスト実行（例: `pnpm run test:domain`）
5. コミット

### リファクタリング時
1. コード編集
2. `pnpm run lint` - Lint + 型チェック
3. `pnpm run check:fix` - 自動修正
4. 全てのテスト実行
5. コミット

### データベーススキーマ変更時
1. Prismaスキーマ編集（`src/infrastructure/prisma-orm/`）
2. `pnpm run db:migrate` - マイグレーション生成・適用
3. `pnpm run supabase:db:type-gen` - 型生成
4. コミット

### PR作成前
1. `pnpm run build` - ビルド確認
2. `pnpm run lint` - 最終Lint
3. 全テスト実行
4. PR作成
