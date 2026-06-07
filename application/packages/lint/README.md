# @trend-diary/lint

リポジトリ共通の Lint / Format 設定（Biome）とカスタムプラグインを集約した dev tooling パッケージ。

## 収録物

- `biome.base.json` — **フレームワーク非依存**の共有 Biome 設定。
  - formatter / 汎用 linter ルール（complexity・correctness・style・suspicious の汎用分）/ `javascript`（vitest globals・formatter）/ `assist` / TS 用 override。
  - React / JSX / DOM / ブラウザ固有のルールは**含めない**（バックエンドパッケージでも安全に共有できるようにするため）。
- `no-use-direct-dom-a-element.grit` — 直接の `<a />` 要素を禁止し `AnchorLink` コンポーネントの利用を促すカスタム GritQL プラグイン。

## 設定の分割方針

| 設定ファイル | 役割 |
| --- | --- |
| `packages/lint/biome.base.json` | フレームワーク非依存の共有ベース。 |
| `application/biome.json`（ルート） | `extends` でベースを取り込み、**Web/React 固有ルール**（a11y / JSX / DOM / ブラウザグローバル / `html` フォーマッタ / grit プラグイン）と、VCS・アプリ固有の `files.includes` を持つ（`root: true`）。 |
| `application/packages/*/biome.json` | `extends: "//"` でルートを継承し、パッケージ固有差分（`noUndeclaredDependencies: off`）のみ記述。 |

## 設計上の制約（Biome 2.0.6）

`extends` のパス参照は**リポジトリ相対パス**にしている。Lint CI は `pnpm install` を実行せず `biome ci .` を直接実行するため、`node_modules` 解決になるパッケージ名指定は使えない。

Web/React ルールを「ベースから外してルートに置く」構成にしているのは、Biome 2.0.6 のネスト設定に以下の制約があるため:

- ネスト設定が相対パスで任意のファイルを `extends` できない（`module not found` になる）。`extends: "//"`（ルート継承）のみ安定して動作する。
- ルートの `overrides[].includes`（例 `!packages/**`）はネスト設定側で各設定ディレクトリ基準に再解決されるため、パッケージ単位の除外として機能しない。

このためベースを「フレームワーク非依存の共有設定」として清潔に保ち、Web/React ルールはアプリ（ルート）設定に置いている。各パッケージは構造上ルートを継承するが、`.tsx` を持たずブラウザグローバルも使用しないため、実コードに対して Web/React ルールが発火することはない。

> [!NOTE]
> grit プラグインはルート `biome.json` から参照している。Biome 2.0.6 は `extends` 経由のプラグインパス解決に未対応で、ベースに置くと `Cannot read file` になるため。
