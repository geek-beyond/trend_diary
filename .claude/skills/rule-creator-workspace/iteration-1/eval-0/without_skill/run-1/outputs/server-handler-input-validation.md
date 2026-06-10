---
paths:
  - "**/web/src/server/**/*.ts"
---

# サーバーハンドラ入力バリデーション規約

`application/packages/web/src/server` 配下の API ハンドラ系ファイルでは、リクエストの入力バリデーションを必ず行ってください。

## 必須事項

- リクエストの `query` / `param` / `json` のうち、ハンドラが受け取る入力は **すべてバリデーションを通すこと**
  - バリデーションには `@/middleware/zod-validator` の `zodValidator` を使用する
  - スキーマはドメイン層の Zod スキーマ、または各ハンドラで定義した Zod スキーマを用いる
- route 定義（`route.ts`）で、ハンドラより前に `zodValidator` ミドルウェアを適用すること
  - 例: `zodValidator('query', schema)` / `zodValidator('param', schema)` / `zodValidator('json', schema)`
- ハンドラ内では検証済みデータを `c.req.valid('query' | 'param' | 'json')` 経由で取得し、`ZodValidatedContext` 系の型で型安全にアクセスすること
- バリデーション失敗時は `zodValidator` が自動的に 422（`Invalid input`）を返すため、ハンドラ側で生の入力を再検証する必要はない

## 適用順序

ミドルウェアは次の順で適用してください。

```
authenticator → zodValidator(param) → zodValidator(json) / zodValidator(query) → handler
```

## ファクトリ利用時の注意

`createSimpleApiHandler` / `createAuthenticatedApiHandler`（`handler/factory.ts`）を使う場合でも、入力を期待するルートには **必ず** route 定義側で `zodValidator` を適用すること。
ファクトリはバリデーション自体を行わないため、適用を怠ると `param` / `json` / `query` が `undefined` になりランタイムエラーの原因となる。

## 理由

- 不正・想定外の入力をドメイン層に渡さず、API 境界で確実に弾くため
- 入力スキーマを明示することでハンドラ内のデータアクセスを型安全にするため
