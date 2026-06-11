---
paths:
  - "**/.oxlintrc.json"
  - "**/biome.json"
---

# Lint設定規約

- linterのカスタムエラーメッセージ（`no-restricted-imports`の`message`等）は英語で記述する
  - 理由: CI・エディタの診断出力に表示され、oxlint/biome組み込みルールのメッセージ（英語）と並ぶため、表記を揃えて一貫した読み心地にする
