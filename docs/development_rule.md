## 開発ルール

### 基本方針

- 仕様はテストコードに記載する（コードを書かずともテストケース名は記載する）
- リファクタリング時は必ずlint、format、testコマンドを実行する
- 必ず日本語を使用する
- `.claude/skills`にCommit、TDDの設定を入れている。必要に応じて参照すること

### GitHub操作

- GitHub操作は原則`gh` CLIで行う
- GitHub MCP（`mcp__github__*`）は原則禁止。ただし**PRの作成・更新のみ**MCP利用可
- 上記以外（Issue・レビュー・CIなど）は`gh` CLIで行うこと

### レビュー時のprefix

レビューコメントには以下のprefixをつける:

- `[must]` - 必ず変更が必要
- `[imo]` - 個人的な意見、修正必須ではない（in my opinion）
- `[nits]` - ささいな指摘（nitpick）
- `[ask]` - 質問
- `[fyi]` - 参考情報

### 重要な規約

コード規約（インポート・API層バリデーション・アーキテクチャ）は、ファイルパスにスコープした`.claude/rules/`へ分離した。該当ファイルを扱う際に自動でコンテキストへ読み込まれる。

- `.claude/rules/import.md` - インポート規約（`src/`配下のTS/TSX）
- `.claude/rules/api-validation.md` - API層バリデーション規約（`web/src/server`配下）
- `.claude/rules/architecture.md` - アーキテクチャ規約（utils禁止・Pinoロガー、`src/`配下のTS/TSX）

