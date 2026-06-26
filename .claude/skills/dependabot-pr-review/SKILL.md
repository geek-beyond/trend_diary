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
  - mcp__github__create_pull_request
  - mcp__github__update_pull_request
  - mcp__github__merge_pull_request
  - mcp__github__update_pull_request_branch
  - mcp__github__add_reply_to_pull_request_comment
  - mcp__github__list_pull_requests
  - mcp__github__pull_request_read
  - mcp__github__actions_list
  - mcp__github__actions_get
---

# Dependabot PR Review & Merge

Dependabot の依存更新PRを、**リリースノート・変更内容・破壊的変更の影響**まで踏まえて1件ずつ評価し、安全なものをマージするスキル。マージ後は main の CI/CD が通り切るまで監視してから次へ進み、開いている対象PRを全て処理する。

## 前提・ツール選択

CLAUDE.md の「GitHub操作」ルールに従う:

- GitHub操作は**原則 `gh` CLI** で行う。PR一覧・PR状態・CIチェック・CD監視などは `gh`（`gh pr list` / `gh pr view` / `gh pr checks` / `gh run list` / `gh run view` / `gh run watch` 等）を使う。
- GitHub MCP（`mcp__github__*`）は**原則禁止**。利用してよいのは **PRの作成・更新（マージ・ブランチ更新を含む）** と **レビューコメントへの返信** のみ。Issue・CI など、それ以外の操作は `gh` CLI を使う。
- 例外として、`gh` が無い実行環境（Claude Code on the web 等）に限り、GitHub MCP（`mcp__github__actions_*` 等を含む）に全面的にフォールバックしてよい。
- **外部イベント待ちに `sleep` をフォアグラウンドで使わない**。CI待機は `run_in_background: true` のタイマー（例: `sleep 180`）を仕掛け、完了通知を受けてから状態を再取得する。`gh run watch <id>` も活用できる。
- `gh ... --json` の応答は巨大になりがち。`--json` で必要フィールドだけ絞る（例: `--json status,conclusion,name`）。MCP フォールバック時に巨大JSONが保存ファイルへ退避された場合は `python3` でスライスして読む。

## 手順

### 1. 対象PRの洗い出し

- `$ARGUMENTS` でPR番号が指定されていればそれを対象にする。
- 未指定なら Dependabot の open PR を列挙する:

  ```bash
  gh pr list --state open --author "app/dependabot" \
    --json number,title,headRefName,labels
  ```

  （フォールバック: `mcp__github__list_pull_requests` で取得し `user.login == dependabot[bot]` を抽出）
- 対象が無ければその旨を伝えて終了。

### 2. リリースノート・変更内容の確認

PR本文には Dependabot が埋め込んだ Release notes / Changelog / Commits が含まれる。`gh pr view <PR番号>` で読み、特に以下を把握する:

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

- マージ可否とチェック状態を `gh` で確認する:

  ```bash
  gh pr view <PR番号> --json mergeable,mergeStateStatus,statusCheckRollup
  gh pr checks <PR番号>
  ```

  `mergeStateStatus` の見方:
  - `BEHIND`: base（main）に追従が必要 → 手順5でブランチ更新。
  - `BLOCKED`: 必須チェック未完了/未パス、またはレビュー要件 → CIの完了待ち。
  - `DIRTY`: コンフリクト → 手順6で解消。
  - `CLEAN`: マージ可。
- （フォールバック: `mcp__github__pull_request_read` の `get` / `get_check_runs`）

### 5. ブランチ更新（BEHIND の場合）

- main を Dependabot ブランチに取り込む。ブランチ更新は PR の更新操作なので `gh` を優先しつつ MCP も可:

  ```bash
  gh pr update-branch <PR番号>
  ```

  （フォールバック: `mcp__github__update_pull_request_branch`）
- これで CI が再実行される。**新しい head SHA に対して** CI が green になるのを待つ（手順7）。
- **他ブランチは使わない**。更新・修正は必ず Dependabot のブランチ上で行う。

### 6. 修正・コンフリクト解消が必要な場合

- 修正は **Dependabot のブランチ**にのみコミットする（他ブランチ禁止）。
- ローカルで対象ブランチを `git fetch` → チェックアウトし、コンフリクトを解消、または必要な追従修正を入れて push する。
- コミットメッセージは why を簡潔に（CLAUDE.md準拠、日本語・適度な敬語）。

### 7. CI green の待機

- `run_in_background: true` で `sleep`（目安 150〜200秒）を仕掛け、完了通知後に `gh pr checks <PR番号>` を再取得する（`gh run watch <run_id>` でも可）。
- 全ジョブ（集約ゲートジョブを含む）の結果が `pass`（または `skipping`/`neutral` の非失敗）になるまで繰り返す。
- いずれかが `fail` の場合は手順6へ戻す。

### 8. マージ

- 全チェック green を確認後、マージする。マージは PR の更新操作なので `gh` を優先しつつ MCP も可:

  ```bash
  gh pr merge <PR番号> --merge
  ```

  （フォールバック: `mcp__github__merge_pull_request`）
- merge method はリポジトリの履歴慣習に合わせる（trend_diary は merge commit）。

### 9. マージ後の main CI/CD 監視（次PRへ進む前の必須ゲート）

- `gh run list --workflow=ci.yaml --branch=main`（フォールバック: `actions_list`）でマージコミットの CI run を特定する。
- `run_in_background` タイマーで待機しつつ `gh run view <run_id>` / `gh run watch <run_id>`（フォールバック: `actions_get` / `actions_list`）で進捗を追い、**CI が success** になるのを確認する。
- 続いて `gh run list --workflow=cd.yaml --branch=main` で `workflow_run` トリガーの run を特定し、**CD も success** を確認する。
  - 依存がワークフロー基盤（actions/checkout 等）に関わる場合、CD の成功は v7 等が実機で動いた証拠になるため特に重視する。
- **CI/CD が green になってから**次のPRに進む。失敗時は原因を切り分け、Dependabot ブランチ上で修正する。

### 10. 全PRの処理

- 対象PRが無くなるまで手順2〜9を繰り返す。
- 全て捌き切ったら、各PRの判断根拠・実施内容・main CI/CD の結果を要約して報告する。

## 判断の原則

- 「全く問題ないもの」だけ自動でマージする。少しでも影響が疑われるものは、コードで影響有無を確定させてから判断する。確定できない/影響ありなら、勝手にマージせず修正方針を提示する。
- メジャーバージョンアップは既定で要精査。リリースノートの breaking change を必ず自リポジトリの利用箇所に突き合わせる。
- 日本語・適度な敬語で報告する（CLAUDE.md準拠）。コミットやPRには why を残す。
