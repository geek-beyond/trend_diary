## 開発ルール

### 基本方針

- 仕様はテストコードに記載する（コードを書かずともテストケース名は記載する）
- リファクタリング時は必ずlint、format、testコマンドを実行する
- 必ず日本語を使用する
- 敬語は使用しない
- `.claude/skills`にCommit、TDDの設定を入れている。必要に応じて参照すること

### ローカル必須ツール

開発に必要なローカルツール。バージョンは`mise.toml` / `.node-version` / `package.json`を正とする（以下は記載時点の参考値）。

- **Node.js** `22.13.0`（`engines`は`^20.19.0 || >=22.13.0`、`.node-version`で固定）
- **pnpm** `11.5.1`（パッケージマネージャー。`corepack enable`で有効化、バージョンは`package.json`の`packageManager`に従う）
- **mise**（Node / pnpmのバージョン管理。`mise.toml`で定義）
- **Docker**（DB等のローカル実行環境。Macの場合はOrbStack推奨）
- **Supabase CLI**（Auth用途。`supabase start`で起動）

### ディレクトリ構成

pnpm monorepo + DDDレイヤード構成。プロジェクトの全体像を素早く掴むための中粒度のツリー（個別ファイルは変更に弱いため記載しない）。

```
trend_diary/
├── application/                # アプリ本体（pnpm monorepo）
│   ├── packages/
│   │   ├── common/             # 全パッケージ共通基盤（エラー・ロガー・結果型・環境変数・i18n等）
│   │   │   └── src/            # env / errors / locale / pagination / result / sanitization / types
│   │   ├── domain/             # ドメイン層（集約・ユースケース・リポジトリIF・Zodスキーマ）
│   │   │   └── src/
│   │   │       ├── article/    # 記事集約（diary / media / use-case / repository / schema / infrastructure）
│   │   │       └── user/       # ユーザー集約
│   │   ├── datastore/          # 永続化層
│   │   │   ├── migrations/     # DBマイグレーション
│   │   │   └── src/            # drizzle-orm（スキーマ）/ rdb（D1クライアント）
│   │   ├── web/                # Webアプリ（Hono + React Router）
│   │   │   └── src/
│   │   │       ├── server/     # API層（article / auth / handler / route）
│   │   │       ├── client/     # フロント（components / features / routes / infrastructure / lib）
│   │   │       ├── middleware/ # 認証等のミドルウェア
│   │   │       └── infrastructure/
│   │   ├── cron/               # 定期実行ジョブ（Cloudflare Workers）
│   │   ├── notification/       # 通知機能
│   │   └── e2e/                # E2Eテスト（Playwright: page / pom / scenario / helper）
│   └── supabase/               # Supabase（Auth）設定
└── docs/                       # ドキュメント（adr / how_to_guides / system_config）
```

### レビュー時のprefix

レビューコメントには以下のprefixをつける:

- `[must]` - 必ず変更が必要
- `[imo]` - 個人的な意見、修正必須ではない（in my opinion）
- `[nits]` - ささいな指摘（nitpick）
- `[ask]` - 質問
- `[fyi]` - 参考情報

### 重要な規約

**インポート**: `src/`ルートからの絶対インポートを使用（TypeScript path mapping: `@/*`）

**バリデーション**:
- データ検証にドメイン層のZodスキーマを使用
- 全てのAPI層エンドポイントで`zodValidator`の使用が必須
  - `query`: クエリパラメータのバリデーション
  - `param`: パスパラメータのバリデーション
  - `json`: リクエストボディのバリデーション
- バリデーション失敗時は自動的に422ステータスで返却
- `ZodValidatedContext`系の型を使用してハンドラー関数で型安全にデータアクセス
- **バリデーション順序**: authenticator → zodValidator(param) → zodValidator(json) → handler

**その他**:
- utilsの作成は禁止
  - 理由: 責任の所在が不明確になり、アーキテクチャ層の境界が曖昧になる。DDDの原則を遵守し、貧血性ドメインを防ぐため
  - 代替案:
    - 共通ロジックは`src/common/`配下の明確な目的を持ったディレクトリに配置
    - ドメイン固有のロジックは各集約内に配置
- Pinoロガーで構造化ログを使用

