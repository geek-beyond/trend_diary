# rule-creator 実行トランスクリプト

タスク: glob パターンで `src` 配下の `.tsx` ファイルだけに効くルールを追加する。内容は「React コンポーネントには必ず displayName を設定する」。

## 手順

1. `/home/user/trend_diary/.claude/skills/rule-creator/SKILL.md` を読み、手順（意図把握 → スコープ／ファイル決定 → 執筆 → 検証）に従った。
2. 既存ルールを `ls /home/user/trend_diary/.claude/rules/` で確認した。
   - 既存: `api-validation.md` / `architecture.md` / `import.md` / `logging.md` / `test.md`
3. 既存ルールの作法を確認するため `architecture.md` / `test.md` / `import.md` を読んだ。
4. リポジトリの実ファイルを `find` / `Glob` で確認し、glob の過不足をチェックした。
5. `displayName` を扱う既存ルールがないことを `Grep` で確認した（重複・矛盾なし）。
6. 新規ファイル `react-component.md` を outputs/ に作成した。

## 参照ファイル

- `/home/user/trend_diary/.claude/skills/rule-creator/SKILL.md`（手順の正）
- `/home/user/trend_diary/.claude/rules/architecture.md`（フロントマター作法・理由ネストの好例）
- `/home/user/trend_diary/.claude/rules/test.md`（パススコープ最小形の例）
- `/home/user/trend_diary/.claude/rules/import.md`（`**/src/**/*.{ts,tsx}` の glob 実例）
- `/home/user/trend_diary/CLAUDE.md`（文体・コメント方針＝why のみ）
- 実ファイル: `application/packages/web/src/client/components/**/*.tsx` 等

## フロントマターのキー名と glob の決定理由

- キー名: `paths`（YAML 配列）。SKILL.md の公式仕様および既存ルール（`architecture.md` / `import.md` / `test.md`）がすべて `paths:` を使用しているため、これに合わせた。
- glob: `"**/src/**/*.tsx"`
  - リポジトリの `.tsx` は `application/packages/web/src/client/...` のように `src/` が深い階層にある。リテラルな `src/*.tsx` では一切マッチしないため、「任意の階層の `src/` 配下」を表す `**/src/**/` を採用した。
  - ユーザー要件は `.tsx` 限定のため、既存 `architecture.md` の `{ts,tsx}` ではなく `.tsx` のみに絞った。
  - 検証: `find application -path "*/src/*" -name "*.tsx"` で 87 件すべてにマッチ。スコープ外は `node_modules` と `application/packages/web/.storybook/preview.tsx`（src 配下でない設定ファイル）のみで、いずれも対象外として妥当。

## 最終ファイルの要点

- ファイル: `react-component.md`（新規。`displayName` を扱う既存ルールがなく追記先がないため新規作成）
- 見出し: `# React コンポーネント規約`（既存ルールの `# 〇〇規約` 様式に準拠）
- 本文: 「React コンポーネントには必ず `displayName` を設定する」を箇条書きで記載し、why（DevTools／エラースタックでの表示名安定、`memo`・`forwardRef`・HOC で名前が失われる問題）を理由としてネストした。
- 文体: 日本語かつ適度な敬語、why のみ記載（CLAUDE.md 開発ルールに準拠）。

## 制約遵守

- 実リポジトリの `/home/user/trend_diary/.claude/rules/` および `CLAUDE.md` は変更していない（読み取りのみ）。
- git commit / push は実施していない。
- 成果物は outputs/ ディレクトリにのみ書き込んだ。
