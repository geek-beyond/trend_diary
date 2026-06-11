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
- **コード品質**: oxlint（lint）+ oxfmt（format / import整理）+ ESLint（命名規則）+ TypeScript

環境変数は.dev.vars.exampleファイルを参考に与える。

テストファイルの配置は以下のルールに従う:
- ユニットテスト（`*.test.ts`）: 実装されているコードと同じ階層に配置
- E2Eテスト: `packages/e2e`に配置（`@trend-diary/e2e`パッケージ）
- テストヘルパー: `src/test/helper`に配置
- テストモック: `src/test/__mocks__`に配置（ドメイン層テストで使用）
- Vitestセットアップ: `src/test/setup`に配置
