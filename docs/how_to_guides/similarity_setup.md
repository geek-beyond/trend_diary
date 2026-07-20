# 重複関数の検出（similarity-ts）

[similarity-ts](https://github.com/mizchi/similarity)（mizchi/similarity）は、AST ベースでコピペ由来の重複関数・類似コードを検出するツールです。lint（oxlint）・未使用コード検出（knip）では拾えない「実装の重複」を可視化し、リファクタリング対象を早期に発見するために導入しています。

CI の `code-quality` ジョブで `pnpm similarity` を実行します（導入直後は既存の重複が残るため非ブロッキングで運用し、解消後にゲート化します）。

## ローカル実行（任意）

`similarity-ts` は Rust 製 CLI で npm 未配布のため、手元で確認したい場合は各自でバイナリを用意します。CI は GitHub Releases の prebuilt バイナリを使うため、ローカルへのインストールは必須ではありません。

### インストール

いずれかの方法で `similarity-ts` を PATH に通します。

```sh
# 方法1: cargo（Rust ツールチェーンが必要。ソースからビルド）
cargo install similarity-ts

# 方法2: GitHub Releases の prebuilt バイナリを取得
#   https://github.com/mizchi/similarity/releases から
#   similarity-<tag>-<target>.tar.gz を展開し similarity-ts を PATH へ配置
```

### 実行

```sh
cd application
pnpm similarity
```

重複が見つかると exit code 1 で終了します。`pnpm similarity` は以下の方針で実行します。

- 対象: `apps` / `packages`
- 型・インターフェースの類似は除外（`--no-types`）。Props 等の自然な型類似がノイズになるため、関数の重複に絞る
- 除外: shadcn / customized プリミティブ、`migrations`
- しきい値: 既定 0.87（`-t` で調整可能）

## 特定の重複を無視する

意図的な類似で検出を抑止したい場合は、対象関数の直前に `similarity-ignore` コメントを付与します（`--show-ignored` で無視対象を一覧表示できます）。
