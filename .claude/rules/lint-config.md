---
paths:
  - "**/.oxlintrc.json"
  - "**/.oxfmtrc.json"
  - "**/eslint.config.js"
---

# Lint設定規約

- linterのカスタムエラーメッセージ（`no-restricted-imports`の`message`等）は英語で記述する
  - 理由: CI・エディタの診断出力に表示され、oxlint/ESLint組み込みルールのメッセージ（英語）と並ぶため、表記を揃えて一貫した読み心地にする
- コード品質ツールは責務を分担する: lint=oxlint / format・import整理=oxfmt / 命名規則=ESLint（`@typescript-eslint/naming-convention`のみ）
  - 命名規則は oxlint が `naming-convention` を未サポートのため ESLint が担当する。ESLint では命名規則以外のルールは有効化しない（lint は oxlint に一本化する）
