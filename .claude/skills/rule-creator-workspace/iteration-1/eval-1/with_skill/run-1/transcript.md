# transcript — rule-creator 実行記録

## タスク

「コード中のユーザー向けの文言（UIに出るメッセージなど）は常に日本語にする」という方針をプロジェクトのルール（`.claude/rules/`）に残す。特定のファイル種別に限らず常に効かせたい。

## 手順

1. スキル本体 `/home/user/trend_diary/.claude/skills/rule-creator/SKILL.md` を読み、手順（意図を捉える → スコープとファイルを決める → 書く → 検証する）に従った。
2. 既存ルールを確認するため `.claude/rules/` を `ls` し、各ファイルを読んだ。
3. 同テーマ（i18n / 文言 / メッセージ）の既存ルールがないか `Grep` で確認した（`日本語|文言|メッセージ|i18n|locale|UI`）→ ヒットなし。
4. スコープを判断し、ルール本文を作成した。
5. フロントマターと文体を既存ルールの作法に照らして検証した。

## 参照ファイル

- スキル: `/home/user/trend_diary/.claude/skills/rule-creator/SKILL.md`
- 既存ルール（作法・スコープ判断の参考）:
  - `/home/user/trend_diary/.claude/rules/architecture.md`（`paths` 付き、理由・代替案をネストする好例）
  - `/home/user/trend_diary/.claude/rules/api-validation.md`（`paths` 付き）
  - `/home/user/trend_diary/.claude/rules/import.md`（`paths` 付き）
  - `/home/user/trend_diary/.claude/rules/logging.md`（`paths` 付き）
  - `/home/user/trend_diary/.claude/rules/test.md`（`paths` 付き）
- プロジェクト方針: `/home/user/trend_diary/CLAUDE.md`（「日本語かつ適度な敬語」「コメントは why のみ」）

## paths を付ける／付けないの判断理由

**付けない（フロントマター自体を省略）。**

- スキルの公式仕様より: `paths:` がある → マッチするファイルを読むときだけコンテキストに載る／`paths:` がない → 全セッションで常時読み込まれる。
- 本タスクの要望は「特定のファイル種別に限らず、常に効いてほしい」。ユーザー向け文言はサーバー・クライアント・通知・cron など任意の場所・任意の拡張子に現れ得るため、パスで絞ると取りこぼす。
- よって常時読み込みが適切で、`paths:` を付けない。既存ルール（`*.test.ts` や `src/**` などパス限定）とは性質が異なり、横断的に効くべきルールである点も一致する。
- 注: 厳密には「常に効く普遍ルールは CLAUDE.md」という選択肢もあるが、これはトピックが明確に切り出せる規約であり、`.claude/rules/` 配下に置く想定という指示にも沿うため、`paths` なしのルールファイルとした。

## 最終ファイルの要点

- ファイル: `outputs/user-facing-messages.md`
- 見出し: `# ユーザー向け文言の言語規約`（既存ルールの `# 〇〇規約` 形式に合わせた）
- 規約本体: ユーザー向け文言（UI テキスト・エラー・通知・バリデーションメッセージ等）は常に日本語。
- why を明記: 利用者は日本語話者想定で、表示言語の統一により一貫した UX を提供するため。
- 適用範囲を明確化: ログ・識別子・コードコメントなどユーザーの目に触れない文字列は対象外、と補足して誤適用を防いだ。
- 文体は日本語かつ適度な敬語、why 中心（CLAUDE.md・スキルの作法に準拠）。

## 制約遵守

- 実リポジトリの `.claude/rules/` および `CLAUDE.md` は一切変更していない（読み取りのみ）。
- git commit / push は実行していない。
- 成果物は指定の `outputs/` ディレクトリにのみ書き込んだ。
