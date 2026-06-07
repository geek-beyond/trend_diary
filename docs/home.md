## ホーム

- [プロダクトゴール](product_goal.md)
- [グランドルール](grand_rule.md)
- [開発ルール](development_rule.md)
- [ドキュメントルール](docs_rule.md)
- [ADR](adr/0_top.md)
- [ハウツーガイド](how_to_guides/0_top.md)
- [システム構成](system_config/config.md)

## 技術スタック

- **ランタイム**: Cloudflare Workers
- **バックエンド**: Hono + React Router v7
- **フロントエンド**: React + TailwindCSS v4 + shadcn/ui
- **データベース**: Cloudflare D1 (SQLite) + Drizzle ORM
- **テスト**: Vitest + Playwright
- **コード品質**: Biome + TypeScript

## ディレクトリ構成

```sh
./src
├── web # アプリケーション層
│   ├── server # Hono API
│   │   ├── article # 記事API
│   │   ├── handler # ハンドラーファクトリー
│   │   ├── v2 # API v2
│   │   └── route.ts
│   ├── middleware # ミドルウェア
│   │   ├── authenticator # 認証ミドルウェア
│   │   ├── context.ts
│   │   ├── error-handler.ts
│   │   ├── request-logger.ts
│   │   └── zod-validator.ts
│   ├── worker.ts # Cloudflare Workersエントリーポイント
│   ├── server.ts # アプリケーションサーバ
│   ├── env.ts
│   └── client # React Router v7 フロントエンド
│       ├── components # 共通コンポーネント
│       │   ├── customized # カスタムコンポーネント
│       │   ├── shadcn # shadcn/ui統合
│       │   └── ui # UIコンポーネント
│       ├── features # 機能別コンポーネント
│       ├── hooks # カスタムフック
│       ├── lib # ユーティリティ
│       ├── routes # ページルート
│       └── infrastructure # フロントエンド用インフラ
├── common # src配下で共通使用するもの
│   ├── errors # エラー型定義
│   ├── locale # 地域化・日付処理
│   ├── pagination # ページネーション
│   ├── sanitization # サニタイゼーション
│   ├── types # 共通型定義
│   ├── logger.ts # ロガー
│   └── schemas.ts # 共通スキーマ
├── domain # ドメイン層（DDD）
│   ├── article # 記事集約
│   └── user # ユーザー集約
│       ├── index.ts # 集約エクスポート
│       ├── factory.ts # ファクトリー
│       ├── infrastructure # リポジトリ実装
│       ├── schema # バリデーションスキーマ
│       ├── repository.ts # リポジトリインターフェース
│       └── use-case.ts # ビジネスロジック
├── infrastructure # インフラストラクチャ層
│   ├── notification # 通知機能
│   ├── drizzle-orm # Drizzle ORM設定
│   │   └── schema.ts # Drizzleスキーマ（スキーマの正本）
│   ├── api.ts # API接続
│   ├── rdb.ts # RDB接続
│   ├── rdb-id.ts # ID生成
│   └── supabase.ts # Supabase接続
├── test # テスト関連
│   ├── __mocks__ # モック
│   ├── e2e # E2Eテスト
│   ├── helper # テストヘルパー
│   ├── vitest # Vitest設定
│   │   ├── client # クライアント側テスト設定
│   │   ├── common # 共通テスト設定
│   │   ├── domain # ドメイン層テスト設定
│   │   ├── server # サーバー側テスト設定
│   │   └── storybook # Storybook用テスト設定
│   └── env.ts # テスト環境設定
├── plugin # カスタムプラグイン
│   └── biome # Biomeプラグイン
```

環境変数は.dev.vars.exampleファイルを参考に与える。

テストファイルの配置は以下のルールに従う:
- ユニットテスト（`*.test.ts`）: 実装されているコードと同じ階層に配置
- E2Eテスト: `packages/e2e`に配置（`@trend-diary/e2e`パッケージ）
- テストヘルパー: `src/test/helper`に配置
- テストモック: `src/test/__mocks__`に配置（ドメイン層テストで使用）
- Vitest設定: `src/test/vitest/config`に配置
