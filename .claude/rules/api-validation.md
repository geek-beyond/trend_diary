---
paths:
  - "**/web/src/server/**/*.ts"
---

# API層バリデーション規約

- データ検証にドメイン層のZodスキーマを使用
- 全てのAPI層エンドポイントで`zodValidator`の使用が必須
  - `query`: クエリパラメータのバリデーション
  - `param`: パスパラメータのバリデーション
  - `json`: リクエストボディのバリデーション
- バリデーション失敗時は自動的に422ステータスで返却
- `ZodValidatedContext`系の型を使用してハンドラー関数で型安全にデータアクセス
- **バリデーション順序**: authenticator → zodValidator(param) → zodValidator(json) → handler
