# 実施記録（rule-creator スキル実行）

## タスク
「APIハンドラ（`application/packages/web/src/server` 配下）では、必ずリクエストの入力バリデーションを行う」というルールをプロジェクトルールとして追加する。サーバーのハンドラ系ファイルだけに効かせたい。

## 実施した手順（SKILL.md に準拠）

### 1. スキルを読む
- `/home/user/trend_diary/.claude/skills/rule-creator/SKILL.md` を読み、手順（意図の把握→スコープとファイル決定→執筆→検証）に従った。

### 2. 意図を捉える
- 何の規約か: API層エンドポイントでの入力バリデーションの必須化。
- なぜ必要か: 不正・想定外の入力を境界（API層）で弾き、ドメイン層／DBへ到達させないため。
- 対象範囲: `web/src/server` 配下のサーバーハンドラ系ファイルに限定。

### 3. 既存ルールとリポジトリ実態の確認
参照したファイル:
- `/home/user/trend_diary/.claude/rules/`（`ls` で一覧化）
  - `api-validation.md` … 既に本テーマを扱う同名ルールが存在（`paths: **/web/src/server/**/*.ts`）。
  - `architecture.md` / `test.md` … 既存の文体・理由のネスト記法を参考にした。
  - `import.md` / `logging.md` … 短文ルールの作法を確認。
- 実装の確認（バリデーション機構の実態把握）:
  - `application/packages/web/src/server/article/route.ts` … `zodValidator('query'|'param'|'json', schema)` をミドルウェアとして連結し、`authenticator → zodValidator → handler` の順で適用していることを確認。
  - `application/packages/web/src/server/article/handler/get-articles.ts` … `ZodValidatedQueryContext` で検証済みデータへ型安全アクセスしていることを確認。
- 対象ファイル群を `find application/packages/web/src/server -name '*.ts'` で列挙し、ハンドラ（`handler/*.ts`）・`route.ts` が存在することを確認。

### 4. ルールの置き場所と paths の決定理由
- **新規ファイルを作らず、既存の `api-validation.md` を改良する方針**とした。
  - 理由: SKILL.md の「同テーマのファイルがあれば追記を優先」「既存ルールと重複・矛盾する規約を別ファイルに増やさない」に従ったため。今回の要望は既存 `api-validation.md` のテーマと完全に一致する。
- **paths は既存どおり `**/web/src/server/**/*.ts` を維持**。
  - 理由: ユーザー要望「サーバーのハンドラ系ファイルだけに効かせたい」を満たす。`web/src/server` 配下に限定され、client 層や他パッケージには載らない。`route.ts`（バリデーションの結線箇所）と `handler/*.ts`（参照側）の両方を含むため過不足がない。

### 5. ルールを書く / 検証
- 既存ルールの作法（見出し `# 〇〇規約`、箇条書き、why を理由としてネスト、日本語＋適度な敬語）に合わせた。
- 元の `api-validation.md` に対し、ユーザー要望の核心である「APIハンドラでは必ず入力バリデーションを行う」を冒頭の必須項目として明示し、その why（境界で不正入力を弾く）を追記した。
- glob は `find` で対象ファイルの実在を確認済み（`**/web/src/server/**/*.ts` が handler・route 双方にマッチ）。

### 制約遵守
- 実リポジトリ（`/home/user/trend_diary/.claude/rules/` や `CLAUDE.md`）は読み取りのみで変更していない。git commit / push もしていない。
- 最終成果物は指定の outputs ディレクトリにのみ書き込んだ。

## 最終ファイルの要点
- 出力: `.../with_skill/run-1/outputs/api-validation.md`
- `paths: **/web/src/server/**/*.ts` でサーバー配下に限定。
- APIハンドラでの入力バリデーション必須化を冒頭で明示し、`query`/`param`/`json` の各 `zodValidator` 適用、ドメイン層 Zod スキーマの利用、422 返却、`ZodValidatedContext` 系での型安全アクセス、`authenticator → zodValidator(param) → zodValidator(json) → handler` の順序を、それぞれ理由（why）付きで記載。
