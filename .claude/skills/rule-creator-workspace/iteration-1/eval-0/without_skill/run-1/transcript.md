# 作業記録（transcript）

## タスク

API ハンドラ（`application/packages/web/src/server` 配下）では必ずリクエストの入力バリデーションを行う、というルールをプロジェクトルールとして追加する。このルールはサーバーのハンドラ系ファイルだけに効くようにする。

## 実施した手順

1. リポジトリの `.claude/` 構成と既存ルールの置き場所を確認した。
   - `/home/user/trend_diary/.claude/rules/` に既存ルールが Markdown ファイルとして配置されていることを確認。
2. 既存ルールファイルを読み、フォーマットとスコープ指定の慣習を把握した。
   - すべてのルールが YAML frontmatter の `paths:`（glob 配列）でスコープを限定していた。
3. 対象となるサーバーハンドラの実装を確認し、ルール文面を実コードに即した内容にした。
4. CLAUDE.md にルール参照に関する記述がないか確認（明示的な記述なし）。
5. 成果物ルールファイルと本 transcript を所定の出力ディレクトリに作成した。

## 参照したファイル

- `/home/user/trend_diary/.claude/rules/api-validation.md`（既存の類似ルール。`**/web/src/server/**/*.ts` でスコープ）
- `/home/user/trend_diary/.claude/rules/architecture.md` / `import.md` / `logging.md` / `test.md`（フォーマットとスコープ表現の慣習確認）
- `/home/user/trend_diary/application/packages/web/src/server/article/route.ts`（`zodValidator` のミドルウェア適用順序）
- `/home/user/trend_diary/application/packages/web/src/server/article/handler/get-articles.ts`（`c.req.valid()` と `ZodValidatedContext` の利用例）
- `/home/user/trend_diary/application/packages/web/src/server/handler/factory.ts`（ファクトリ利用時もバリデーションが別途必須である旨）
- `/home/user/trend_diary/application/packages/web/src/middleware/zod-validator.ts`（失敗時に 422 を返す挙動）

## ルールの置き場所の決定理由

- このプロジェクトでは、特定ディレクトリ・ファイル種別に閉じた指示は `.claude/rules/` 配下の Markdown に置き、YAML frontmatter の `paths:` glob でスコープを限定する運用になっている。
- 「サーバーのハンドラ系ファイルだけに効かせたい」という要件は、glob `**/web/src/server/**/*.ts` で表現するのが既存の `logging.md`（`**/packages/web/src/server/**/*.ts`）や `api-validation.md` と整合的。
- そのため CLAUDE.md（常時適用される全体方針）ではなく、`.claude/rules/` に置くスコープ付きルールとして作成するのが適切と判断した。
- 本タスクの制約により実リポジトリは変更せず、成果物は指定の outputs ディレクトリに `server-handler-input-validation.md` として書き出した（実運用時は `.claude/rules/` 配下へ配置する想定）。
- 注: 既存の `api-validation.md` がほぼ同等のスコープ・主旨を持つため、実運用ではそちらへの統合・追記も選択肢となる。今回は独立したルールファイルとして成果物を作成した。

## 最終ファイルの要点

- スコープ: `paths: ["**/web/src/server/**/*.ts"]`（サーバーハンドラ系ファイルのみ）。
- 必須事項: `query` / `param` / `json` のうちハンドラが受け取る入力はすべて `zodValidator`（`@/middleware/zod-validator`）でバリデーションする。
- route 定義でハンドラより前に `zodValidator` を適用し、ハンドラ内では `c.req.valid()` と `ZodValidatedContext` 系の型で検証済みデータにアクセスする。
- 適用順序: `authenticator → zodValidator(param) → zodValidator(json)/query → handler`。
- ファクトリ（`createSimpleApiHandler` / `createAuthenticatedApiHandler`）利用時もバリデーションは別途必須（怠ると undefined でランタイムエラー）。
- 失敗時は `zodValidator` が自動的に 422 を返す。
