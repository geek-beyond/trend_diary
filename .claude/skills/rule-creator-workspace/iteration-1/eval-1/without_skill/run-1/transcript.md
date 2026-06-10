# transcript: ユーザー向け文言の日本語化ルール作成

## タスク

「コード中のユーザー向けの文言（UIに出るメッセージなど）は常に日本語にする」という方針を、特定のファイル種別に限らず常に効く形でプロジェクトのルールに残す。

## 手順

1. 既存のルール置き場 `/home/user/trend_diary/.claude/rules/` の構成を確認した。
   - 存在するファイル: `api-validation.md` / `architecture.md` / `import.md` / `logging.md` / `test.md`
2. 各ルールファイルを読み、フォーマットを把握した。
   - すべて YAML frontmatter に `paths`（glob 配列）を持ち、本文は Markdown の見出し + 箇条書き。
   - 例: `api-validation.md` は `**/web/src/server/**/*.ts`、`test.md` は `**/*.test.ts` のように、対象ファイル種別/ディレクトリを glob で限定している。
3. `CLAUDE.md`（シンボリックリンク先 `docs/development_rule.md`）を確認した。
   - これは常時適用のプロジェクト全体方針が書かれる場所。`必ず日本語かつ適度な敬語を使用する` という近い記述が既にある（ただしこれは応答トーンの話で、UI文言の話ではない）。

## 参照したファイル

- `/home/user/trend_diary/.claude/rules/api-validation.md`
- `/home/user/trend_diary/.claude/rules/architecture.md`
- `/home/user/trend_diary/.claude/rules/import.md`
- `/home/user/trend_diary/.claude/rules/logging.md`
- `/home/user/trend_diary/.claude/rules/test.md`
- `/home/user/trend_diary/docs/development_rule.md`（= `CLAUDE.md` の実体）

## 置き場所の判断理由

- ユーザーの要望は「プロジェクトのルールに残す」「特定のファイル種別に限らず常に効いてほしい」の2点。
- 既存ルールはすべて `.claude/rules/` に独立した `.md` として置かれ、`paths` glob で適用範囲を制御する仕組み。要望は「ルールとして残す」なので、この仕組みに沿って `.claude/rules/` 形式の独立ファイルとして作成するのが最も忠実。
- 「特定のファイル種別に限らず常に効く」を満たすため、`paths` を狭い glob にせず `**/*`（全ファイルにマッチ）とした。これにより `.ts` / `.tsx`・i18n リソース・テンプレート等、種別を問わず適用される。
- CLAUDE.md（`docs/development_rule.md`）への追記も選択肢だったが、(a) 実リポジトリ改変は本タスクの制約で禁止、(b) 成果物は指定の outputs ディレクトリにのみ書く、という制約があるため、独立ルールファイルを outputs に出力する形にした。

## 最終ファイルの要点

- ファイル名: `user-facing-text-language.md`
- frontmatter: `paths: ["**/*"]`（全ファイル対象 = 常時適用）
- 本文の要点:
  - UIに見えるテキスト（ラベル・ボタン・エラー・トースト・バリデーション・通知・メール等）は常に日本語にする。
  - 適用対象外を明示（識別子、開発者向けログ/例外内部メッセージ、外部仕様で英語必須のキー/列挙値）。
  - i18n の仕組みがある場合は直書きせず日本語の翻訳リソースとして登録する。
  - 理由（why）も記載: エンドユーザーが日本語話者前提で、一貫した体験のため。

## 出力先

- ルール: `/home/user/trend_diary/.claude/skills/rule-creator-workspace/iteration-1/eval-1/without_skill/run-1/outputs/user-facing-text-language.md`
- transcript: 本ファイル
