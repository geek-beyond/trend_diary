---
paths:
  - "**/.oxlintrc.json"
  - "**/.oxfmtrc.json"
---

# Lint設定規約

- linterのカスタムエラーメッセージ（`no-restricted-imports`の`message`等）は英語で記述する
  - 理由: CI・エディタの診断出力に表示され、oxlint組み込みルールのメッセージ（英語）と並ぶため、表記を揃えて一貫した読み心地にする
- コード品質ツールは責務を分担する: lint=oxlint / format・import整理=oxfmt / 未使用コード=knip / 重複関数の検出=similarity-ts
  - 命名規則の機械的な強制は行わない（oxlint が `naming-convention` を未サポートのため）。命名はレビューで担保する
  - similarity-ts は AST ベースでコピペ由来の重複関数を検出する。`pnpm similarity` で実行する
