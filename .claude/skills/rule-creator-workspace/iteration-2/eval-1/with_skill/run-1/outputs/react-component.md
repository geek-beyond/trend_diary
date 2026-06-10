---
paths:
  - "**/src/**/*.tsx"
---

# React コンポーネント規約

- React コンポーネントには必ず `displayName` を設定する
  - 理由: React DevTools やエラースタックでの表示名が安定し、デバッグやコンポーネント特定が容易になる。`memo`・`forwardRef`・HOC でラップすると推論名が失われたり匿名表示になるため、明示的に設定して可読性を保つ
