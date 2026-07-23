## 開発ルール

### 基本方針

- 仕様はテストコードに記載する（コードを書かずともテストケース名は記載する）
- lint / format / test は git hook（pre-commit / pre-push）と CI で担保する（フックは一部の軽量な検証・テストのみを実行し、web・E2E を含むフルテストは CI で実行する）。手元での実行漏れをゲートで拾うため、クローン後に `./scripts/git-hooks/install.sh` でフックを有効化することを必須とする
- FSD のスライス境界とドメイン集約の境界は import-lint で守る。スライス／集約の内部実装へは直接 import せず、境界直下の `index.ts`（公開 API）を経由する。設定と方針は `.importlintrc.jsonc` と [ADR](adr/20260720_import-lintでFSDとドメインの境界を守る.md) を参照する
- 必ず日本語かつ適度な敬語を使用する
- コメントは why（なぜそうするか）だけを書く。what（何をするか）はコードから読めるので書かない。移行の経緯など運用に不要な背景はコードに残さず PR・コミットに書く

### ローカル必須ツール

開発に必要なローカルツール。バージョンは`mise.toml` / `.node-version` / `package.json`を正とする（以下は記載時点の参考値）。

- **git** `2.54以上`（config-based hooksによるpre-commit / pre-pushフックに必要。`./scripts/git-hooks/install.sh`での有効化必須）
- **Node.js** `22.13.0`（`engines`は`^20.19.0 || >=22.13.0`、`.node-version` や `mise.toml` 等で固定）
- **pnpm** `11.5.1`（パッケージマネージャー。`corepack enable`で有効化、バージョンは`package.json`の`packageManager`に従う）
- **mise**（Node / pnpmのバージョン管理。`mise.toml`で定義）
- **Docker**（DB等のローカル実行環境。Macの場合はOrbStack推奨）
- **Supabase CLI**（Auth用途。`supabase start`で起動）

### ディレクトリ構成

pnpm monorepo + DDDレイヤード構成。プロジェクトの全体像を素早く掴むための中粒度のツリー（個別ファイルは変更に弱いため記載しない）。

```
trend_diary/                    # モノレポルート（pnpm monorepo）
├── apps/                       # デプロイ・実行するエントリポイント（他から import されない）
│   ├── web/                    # Webアプリ（Hono + React Router）
│   │   └── src/
│   │       ├── server/         # API層（article / auth / handler / route）
│   │       ├── client/         # フロント（components / features / routes / infrastructure / lib）
│   │       ├── middleware/     # 認証等のミドルウェア
│   │       └── infrastructure/
│   └── cron/                   # 定期実行ジョブ（Cloudflare Workers）
├── e2e/                        # E2Eテスト（Playwright: pom / scenario / helper。デプロイ物ではないため apps/ とは別階層）
├── packages/                   # 各 app から共有されるライブラリ（@trend-diary/*）
│   ├── std/                    # 純粋な共通基盤（どの層からも利用可・infra非依存）
│   │   └── src/                # contract / errors / locale / pagination / result / sanitization / schemas / types
│   ├── logger/                 # Pinoベースの構造化ロガー
│   ├── runtime/                # 実行環境に触れる道具（env: Workers bindings / http: fetchWithTimeout）
│   ├── authentication/         # 認証（OAuth / passkey / password / session / admin）
│   ├── domain/                 # ドメイン層（集約・ユースケース・ポートIF・Zodスキーマ）
│   │   └── src/
│   │       ├── article/        # 記事集約（diary / media / use-case / port / schema / infrastructure）
│   │       └── user/           # ユーザー集約
│   ├── datastore/              # 永続化層
│   │   ├── migrations/         # DBマイグレーション
│   │   └── src/                # drizzle-orm（スキーマ）/ rdb（D1クライアント）
│   ├── notification/           # 通知機能
│   └── config/                 # 共有ツール設定（vitest プリセット等。サブパスで公開）
├── supabase/                   # Supabase（Auth）設定
└── docs/                       # ドキュメント（adr / how_to_guides / system_config）
```

### レビュー時のprefix

レビューコメントには以下のprefixをつける:

- `[must]` - 必ず変更が必要
- `[imo]` - 個人的な意見、修正必須ではない（in my opinion）
- `[nits]` - ささいな指摘（nitpick）
- `[ask]` - 質問
- `[fyi]` - 参考情報
