---
name: dependabot-pr-review
description: Dependabot PRのリリースノートまで読んでマージ可否を判断し、問題ないものはマージする。マージ後はmainのCI/CDが green になるまで監視してから次のPRへ進み、全PRを捌き切る。「dependabot のPRを見て」「依存更新PRをマージして」等のときに使う。
argument-hint: "[PR番号(任意。未指定なら全 Dependabot PR を対象)]"
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - WebFetch
  - mcp__github__list_pull_requests
  - mcp__github__pull_request_read
  - mcp__github__update_pull_request_branch
  - mcp__github__merge_pull_request
  - mcp__github__actions_list
  - mcp__github__actions_get
  - mcp__github__get_release_by_tag
---

# Dependabot PR Review & Merge

Dependabot の依存更新PRを、**リリースノート・変更内容・破壊的変更の影響**まで踏まえて1件ずつ評価し、安全なものをマージするスキル。マージ後は main の CI/CD が通り切るまで監視してから次へ進み、開いている対象PRを全て処理する。

## 前提・ツール選択

- GitHub操作は原則 `gh` CLI（プロジェクト方針）。ただし **PRのマージ・更新・状態取得**は GitHub MCP（`mcp__github__*`）も利用可。
- `gh` が無い実行環境（Claude Code on the web 等）では、GitHub MCP に全面的にフォールバックする。
- **外部イベント待ちに `sleep` をフォアグラウンドで使わない**。CI待機は `run_in_background: true` のタイマー（例: `sleep 180`）を仕掛け、完了通知を受けてから状態を再取得する。
- `actions_list` / `pull_request_read get` の応答は巨大になりがち。一覧の解析は保存ファイルを `python3` でスライスし、必要フィールドだけ取り出す。

## 手順

### 1. 対象PRの洗い出し

- `$ARGUMENTS` でPR番号が指定されていればそれを対象にする。
- 未指定なら `mcp__github__list_pull_requests`（`state: open`）で一覧を取得し、`user.login` が `dependabot[bot]` のものを対象にする。
- 対象が無ければその旨を伝えて終了。

### 2. リリースノート・変更内容の確認

PR本文には Dependabot が埋め込んだ Release notes / Changelog / Commits が含まれる。これを読み、特に以下を把握する:

- **メジャーバージョンアップか**（破壊的変更の有無）。
- Release notes 内の **breaking change / removed / 「block」「require」などの強い変更**。
- 必要なら `WebFetch` で該当アクション/ライブラリの該当PR・CHANGELOGを直接読み、**ブロック条件やオプトアウト手段**まで確認する。

### 3. 自リポジトリへの影響評価（最重要）

破壊的変更が「**このリポジトリの使い方に当たるか**」をコードで裏取りする。一般論で判断しない。

- `Grep` で当該依存の利用箇所を洗う（例: `.github/workflows` 配下の `uses:`、`package.json`、設定ファイル）。
- 変更の発火条件と、自リポジトリの実際の利用条件を突き合わせる。
  - 例: checkout v7 の「`pull_request_target`/`workflow_run` でのフォークPRチェックアウトをブロック」は、`workflow_run` を `branches: [main]` でフィルタし main コミットをデプロイしている CD には当たらない（フォークPRをチェックアウトしないため）。
- 影響ありと判断したら、勝手にマージせず修正方針を立てる（手順6）。

### 4. CI状態とマージ可否の確認

- `pull_request_read`（`method: get`）で `mergeable_state` を確認する。
  - `behind`: base（main）に追従が必要 → 手順5でブランチ更新。
  - `blocked`: 必須チェック未完了/未パス、またはレビュー要件 → CIの完了待ち。
  - `dirty`: コンフリクト → 手順6で解消。
  - `clean`: マージ可。
- `pull_request_read`（`method: get_check_runs`）で各チェックの `conclusion` を確認する。

### 5. ブランチ更新（behind の場合）

- `mcp__github__update_pull_request_branch` で main を Dependabot ブランチに取り込む。
- これで CI が再実行される。**新しい head SHA に対して** CI が green になるのを待つ（手順7）。
- **他ブランチは使わない**。更新・修正は必ず Dependabot のブランチ上で行う。

### 6. 修正・コンフリクト解消が必要な場合

- 修正は **Dependabot のブランチ**にのみコミットする（他ブランチ禁止）。
- ローカルで対象ブランチを `git fetch` → チェックアウトし、コンフリクトを解消、または必要な追従修正を入れて push する。
- コミットメッセージは why を簡潔に（CLAUDE.md準拠、日本語・適度な敬語）。

### 7. CI green の待機

- `run_in_background: true` で `sleep`（目安 150〜200秒）を仕掛け、完了通知後に `pull_request_read get_check_runs` を再取得する。
- 全ジョブ（集約ゲートジョブを含む）の `conclusion` が `success`（または `skipped`/`neutral` の非失敗）になるまで繰り返す。
- いずれかが `failure` の場合は手順6へ戻す。

### 8. マージ

- 全チェック green を確認後、`mcp__github__merge_pull_request` でマージする。
- merge method はリポジトリの履歴慣習に合わせる（trend_diary は merge commit）。

### 9. マージ後の main CI/CD 監視（次PRへ進む前の必須ゲート）

- `actions_list`（`list_workflow_runs`, `ci.yaml`, `branch: main`）でマージコミットの CI run を特定する。
- `run_in_background` タイマーで待機しつつ `actions_get get_workflow_run` / `actions_list list_workflow_jobs` で進捗を追い、**CI が success** になるのを確認する。
- 続いて `cd.yaml` の `workflow_run` トリガーの run を特定し、**CD も success** を確認する。
  - 依存がワークフロー基盤（actions/checkout 等）に関わる場合、CD の成功は v7 等が実機で動いた証拠になるため特に重視する。
- **CI/CD が green になってから**次のPRに進む。失敗時は原因を切り分け、Dependabot ブランチ上で修正する。

### 10. 全PRの処理

- 対象PRが無くなるまで手順2〜9を繰り返す。
- 全て捌き切ったら、各PRの判断根拠・実施内容・main CI/CD の結果を要約して報告する。

## 判断の原則

- 「全く問題ないもの」だけ自動でマージする。少しでも影響が疑われるものは、コードで影響有無を確定させてから判断する。確定できない/影響ありなら、勝手にマージせず修正方針を提示する。
- メジャーバージョンアップは既定で要精査。リリースノートの breaking change を必ず自リポジトリの利用箇所に突き合わせる。
- 日本語・適度な敬語で報告する（CLAUDE.md準拠）。コミットやPRには why を残す。
