# transcript: client コンポーネント命名規約の追加

## タスク

`application/packages/web/src/client/components` 配下の `.tsx` ファイルにだけ効く命名規約を追加する。内容は「コンポーネントは PascalCase で名付ける」。

## 手順

1. 既存のルール格納場所 `/home/user/trend_diary/.claude/rules/` の構成を確認した。
   - 5 ファイル存在: `api-validation.md` / `architecture.md` / `import.md` / `logging.md` / `test.md`
2. 各ルールファイルを読み、フォーマット（命名規約の書き方）を把握した。
3. ターゲットディレクトリ配下の実ファイルを `find` で確認し、glob が実在ファイルにマッチすることを検証した。
4. 既存フォーマットに合わせてルールファイルを作成した。
5. 実リポジトリ（`.claude/rules/` や `CLAUDE.md`）は一切変更せず、成果物は指定の outputs ディレクトリにのみ書き込んだ。

## 参照ファイル

- `/home/user/trend_diary/.claude/rules/test.md`
- `/home/user/trend_diary/.claude/rules/api-validation.md`
- `/home/user/trend_diary/.claude/rules/import.md`
- `/home/user/trend_diary/.claude/rules/architecture.md`
- `/home/user/trend_diary/.claude/rules/logging.md`
- `/home/user/trend_diary/application/packages/web/src/client/components/` 配下の `.tsx` 群（41 ファイル）

## フォーマットの観察結果

既存ルールは共通して次の構造を取る:

- YAML frontmatter に `paths:` の glob 配列を持つ
- 本文は `# 〜規約` という見出し + 箇条書き
- 日本語で記述
- 多くのルールが `- 理由:` を添えている
- glob は monorepo 全体で安定するよう `**/` プレフィックスを使う（例: `**/packages/web/src/server/**/*.ts`、`**/src/**/*.{ts,tsx}`）

## glob / スコープの判断理由

- 要件は「client のコンポーネントファイル（`application/packages/web/src/client/components` 配下の `.tsx`）にだけ効く」こと。
- 既存の `api-validation.md`（`**/web/src/server/**/*.ts`）や `logging.md`（`**/packages/web/src/server/**/*.ts`）に倣い、`**/` プレフィックス付きの絶対構造で記述。
- 採用した glob: `**/packages/web/src/client/components/**/*.tsx`
  - `client/components` 配下に限定するため `components` をパスに含める。
  - `.tsx` のみに限定（`.ts` は除外）。`*.tsx` で拡張子を絞る。
  - サブディレクトリ（ui/ customized/ shadcn/ 等）の深さに依存しないよう `**/` を `components/` の後に置いた。
  - `find` で 41 件の `.tsx` がこのパス配下に実在することを確認済み。

## 最終ファイルの要点

- ファイル: `outputs/component-naming.md`
- frontmatter: `paths: ["**/packages/web/src/client/components/**/*.tsx"]`
- 見出し: `# コンポーネント命名規約`
- 規約: コンポーネントは PascalCase で名付ける（理由付き）
- 既存ルール群と同じトーン・構造に統一した。
