# @trend-diary/biome-plugin

Biome 用のカスタム GritQL プラグインをまとめた dev tooling パッケージ。

## 収録プラグイン

- `no-use-direct-dom-a-element.grit`
  - 直接の `<a />` 要素の使用を禁止し、`AnchorLink` コンポーネントの利用を促す。

## 利用方法

`application/biome.json` の `plugins` でリポジトリ相対パスとして参照する。

```json
{
  "plugins": ["./packages/biome-plugin/no-use-direct-dom-a-element.grit"]
}
```

> [!NOTE]
> Biome の `plugins` は `node_modules` からのパッケージ名解決に未対応（Biome 2.0.6 時点）であり、
> かつ Lint CI は `pnpm install` を実行せず `biome ci .` を直接実行するため、
> パッケージ名ではなくリポジトリ相対パスで参照する。
