# @trend-diary/lint

リポジトリ共通の Lint / Format 設定（Biome）とカスタムプラグインを集約した dev tooling パッケージ。

## 収録物

- `biome.base.json` — **フレームワーク非依存**の共有 Biome 設定。
  - formatter / 汎用 linter ルール（complexity・correctness・style・suspicious の汎用分）/ `javascript`（vitest globals・formatter）/ `assist` / TS 用 override。
  - React / JSX / DOM / ブラウザ固有のルールは**含めない**（バックエンドパッケージが安全に共有できるようにするため）。
- `no-use-direct-dom-a-element.grit` — 直接の `<a />` 要素を禁止し `AnchorLink` コンポーネントの利用を促すカスタム GritQL プラグイン。

## 設定の分割方針

| 設定ファイル | role / 継承 |
| --- | --- |
| `packages/lint/biome.base.json` | フレームワーク非依存の共有ベース。 |
| `application/biome.json`（ルート） | `extends: ["./packages/lint/biome.base.json"]`。**Web/React 固有ルール**（a11y / JSX / DOM / ブラウザグローバル / `html` フォーマッタ）・CSS パーサ設定・grit プラグイン・VCS・アプリ固有 `files.includes` を持つ（`root: true`）。 |
| `application/packages/*/biome.json` | `root: false` + `extends: ["../lint/biome.base.json"]`。共有ベースを**直接**継承し、パッケージ固有差分（`noUndeclaredDependencies: off`）のみ記述。 |

各パッケージはルートではなく**ベースを直接** `extends` するため、アプリ側の Web/React ルールや grit プラグインを一切継承しない（完全分離）。

## 設計メモ

- `extends` のパス参照は**リポジトリ相対パス**にしている。Lint CI は `pnpm install` を実行せず `biome ci .` を直接実行するため、`node_modules` 解決になるパッケージ名指定は使えない。
- ネスト設定からの相対パス `extends`（`../lint/biome.base.json`）は Biome 2.4.x で安定動作する（2.0.x では解決できなかった）。本リポジトリの Biome バージョンは `package.json` と `.github/workflows/lint.yaml`（`BIOME_VERSION`）で管理している。
- grit プラグインと CSS（Tailwind）パーサ設定はアプリ固有のためルート `biome.json` に置いている。
