# 作業記録 (transcript)

## タスク

「リリースのたびに、CHANGELOGを更新して、バージョンタグを打って、wrangler deploy して、最後に Discord に完了通知を送る——この一連の手順をプロジェクトのルールに追加しておいてほしい」という依頼。
この一連のリリース手順をプロジェクトのルールとして永続化する。

## 実施手順

1. `.claude/` 配下の構成を確認し、ルールが `.claude/rules/*.md` に置かれていることを把握。
2. 既存ルール 5 件を読み、フォーマット（YAML frontmatter の `paths` グロブ + 日本語 Markdown 本文）を把握。
   - `api-validation.md` / `architecture.md` / `import.md` / `logging.md` / `test.md`
3. リリース手順を実態に即して書くため、リポジトリ内の関連実装を調査。
4. ルールファイル `release.md` を成果物ディレクトリに作成。
5. 本 transcript を作成。

## 参照ファイル

- `/home/user/trend_diary/.claude/rules/api-validation.md`（frontmatter + 本文の書式参考）
- `/home/user/trend_diary/.claude/rules/architecture.md`
- `/home/user/trend_diary/.claude/rules/import.md`
- `/home/user/trend_diary/.claude/rules/logging.md`
- `/home/user/trend_diary/.claude/rules/test.md`
- `/home/user/trend_diary/application/packages/cron/package.json`（`deploy: wrangler deploy` を確認）
- `/home/user/trend_diary/application/packages/web/package.json`（scripts / wrangler 利用箇所を確認）
- `/home/user/trend_diary/application/packages/notification/src/discord.ts`（`DiscordWebhookClient` の存在を確認）
- `/home/user/trend_diary/.github/workflows/cd.yaml`（wrangler-action でのデプロイ、`DISCORD_WEBHOOK_URL` シークレットを確認）

## 調査で分かった実態（ルールに反映した根拠）

- デプロイは Cloudflare Workers であり `wrangler deploy` を使用。対象は `packages/web` と `packages/cron`。
- Discord 通知は既存の `packages/notification` の `DiscordWebhookClient` と `DISCORD_WEBHOOK_URL` 環境変数で実現されている。
- 現状リポジトリに `CHANGELOG.md` は未存在（=リリース時に新規作成/追記する運用になる）。
- CLAUDE.md の方針に従い、本文は日本語かつ適度な敬語、コメント的記述は why 中心。

## 置き場所 / 形式の判断理由

- **置き場所**: 既存のプロジェクトルールは `.claude/rules/*.md` に集約されているため、本ルールも同形式の `release.md` とした。
  - ただし制約により実リポジトリの `.claude/rules/` は変更せず、成果物は指定の outputs ディレクトリに出力した。
  - 実運用に取り込む際は `/home/user/trend_diary/.claude/rules/release.md` へ配置する想定。
- **形式**: 既存ルールに合わせ、YAML frontmatter（`paths`）+ 日本語 Markdown 本文。
- **`paths` の選定**: リリース手順は特定のファイル種別に閉じた規約ではなく、リリース作業という横断的なプロセス規約のため、広く効くよう `**/*` を指定した。
  - 既存ルールは `**/web/src/server/**` など限定 glob が中心だが、本ルールは作業手順であり対象ファイルを限定する性質ではないため、あえて全体に効かせている。

## 最終成果物の要点

- ファイル: `outputs/release.md`
- 内容: 「CHANGELOG 更新 → バージョンタグ → wrangler deploy → Discord 完了通知」の 4 ステップを、順序厳守の手順として明文化。
  - 各ステップに具体的なコマンド例と理由、対象パッケージ、既存通知基盤の利用方法を記載。
  - 失敗時は原因解消後に後続へ進む（通知だけ先行しない）旨の注意も追記。
```

## 制約遵守

- 実リポジトリの `.claude/rules/` や `CLAUDE.md` は読み取りのみで変更していない。
- git commit / push は実施していない。
- 書き込みは指定の outputs ディレクトリと本 transcript のみ。
- rule-creator スキルは参照していない（素の挙動で作成）。
