---
paths:
  - "**/packages/web/src/client/components/**/*.tsx"
---

# 命名規約

- コンポーネントは PascalCase で名付ける
  - 理由: JSX では小文字始まりのタグは HTML 要素として解釈されるため、コンポーネントは大文字始まりにする必要がある。PascalCase に統一することで要素とコンポーネントを一目で区別でき、React の慣例にも沿う
