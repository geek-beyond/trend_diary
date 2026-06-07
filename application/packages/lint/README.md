# @trend-diary/lint

リポジトリ共通の Lint / Format 設定（Biome）とカスタムプラグインを集約した dev tooling パッケージ。

## 収録物

- `biome.base.json` — 共有の Biome 設定（formatter / linter ルール / javascript / assist / plugins）。
- `no-use-direct-dom-a-element.grit` — 直接の `<a />` 要素を禁止し `AnchorLink` コンポーネントの利用を促すカスタム GritQL プラグイン。

## 構成方針

各 `biome.json` は本パッケージの共有設定を基点に分割している。

- ルート `application/biome.json`
  - `extends: ["./packages/lint/biome.base.json"]` で共有設定を取り込む（`root: true`）。
  - VCS 設定とアプリ固有の `files.includes`（shadcn / supabase / migrations の除外）はルートにのみ置く。
- 各ワークスペースパッケージ `packages/*/biome.json`
  - `extends: "//"` でルート設定（＝共有設定）を継承し、パッケージ固有の差分のみ記述する。

> [!NOTE]
> `extends` のパス参照は**リポジトリ相対パス**にしている。
> Biome 2.x の `extends` はパッケージ名指定だと `node_modules` から解決するが、
> Lint CI は `pnpm install` を実行せず `biome ci .` を直接実行するため、`node_modules` 非依存の相対パスにする必要がある。
> （`extends: "//"` はルート設定への継承ショートカットで、相対パスを書かずに済む。）
