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

- GitHub操作は **GitHub MCP（`mcp__github__*`）でも `gh` CLI でも、その環境で使える方**で行ってよい。どちらかを一律に優先しなくてよい。`gh` の認証が無い／レート制限に引っかかる環境では MCP を、`gh` が快適に使える環境では `gh` を、と状況で選ぶ（以降の手順では MCP と `gh` を併記する）。
- **外部イベント待ちに `sleep` をフォアグラウンドで使わない**。CI待機は `run_in_background: true` のタイマー（例: `sleep 180`）を仕掛け、完了通知を受けてから状態を再取得する（`gh run watch <id>` でも可）。
- 一覧系（CI run 一覧・check 一覧）の応答は巨大になりがち。`gh ... --json` で必要フィールドだけ絞る、または MCP の応答が保存ファイルへ退避された場合は `python3` でスライスして読む。

## 手順

### 1. 対象PRの洗い出し

- `$ARGUMENTS` でPR番号が指定されていればそれを対象にする。
- 未指定なら Dependabot の open PR を列挙する:
  - MCP: `mcp__github__list_pull_requests`（`state: open`）→ `user.login == dependabot[bot]` を抽出。
  - gh: `gh pr list --state open --author "app/dependabot" --json number,title,headRefName,labels`。
- 対象が無ければその旨を伝えて終了。

### 2. リリースノート・変更内容の確認

PR本文には Dependabot が埋め込んだ Release notes / Changelog / Commits が含まれる（`pull_request_read get` または `gh pr view <PR番号>` で取得）。これを読み、特に以下を把握する:

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

- マージ可否とチェック状態を確認する:
  - MCP: `pull_request_read`（`method: get` で `mergeable_state`、`method: get_check_runs` で各チェックの `conclusion`）。
  - gh: `gh pr view <PR番号> --json mergeable,mergeStateStatus,statusCheckRollup` / `gh pr checks <PR番号>`。
- 状態の見方:
  - `behind` / `BEHIND`: base（main）に追従が必要 → 手順5でブランチ更新。
  - `blocked` / `BLOCKED`: 必須チェック未完了/未パス、またはレビュー要件 → CIの完了待ち。
  - `dirty` / `DIRTY`: コンフリクト → 手順6で解消。
  - `clean` / `CLEAN`: マージ可。

### 5. ブランチ更新（behind の場合）

- main を Dependabot ブランチに取り込む:
  - MCP: `mcp__github__update_pull_request_branch`。
  - gh: `gh pr update-branch <PR番号>`。
- これで CI が再実行される。**新しい head SHA に対して** CI が green になるのを待つ（手順7）。
- **他ブランチは使わない**。更新・修正は必ず Dependabot のブランチ上で行う。

### 6. 修正・コンフリクト解消が必要な場合

- 修正は **Dependabot のブランチ**にのみコミットする（他ブランチ禁止）。
- ローカルで対象ブランチを `git fetch` → チェックアウトし、コンフリクトを解消、または必要な追従修正を入れて push する。
- コミットメッセージは why を簡潔に（CLAUDE.md準拠、日本語・適度な敬語）。

### 7. CI green の待機

- `run_in_background: true` で `sleep`（目安 150〜200秒）を仕掛け、完了通知後に CI状態を再取得する（`pull_request_read get_check_runs` または `gh pr checks <PR番号>` / `gh run watch <run_id>`）。
- 全ジョブ（集約ゲートジョブを含む）の結果が `success`（または `skipped`/`neutral` の非失敗）になるまで繰り返す。
- いずれかが `failure` の場合は手順6へ戻す。

### 8. マージ

- 全チェック green を確認後、マージする:
  - MCP: `mcp__github__merge_pull_request`。
  - gh: `gh pr merge <PR番号> --merge`。
- merge method はリポジトリの履歴慣習に合わせる（trend_diary は merge commit）。

### 9. マージ後の main CI/CD 監視（次PRへ進む前の必須ゲート）

- マージコミットの CI run を特定する:
  - MCP: `actions_list`（`list_workflow_runs`, `ci.yaml`, `branch: main`）。
  - gh: `gh run list --workflow=ci.yaml --branch=main`。
- `run_in_background` タイマーで待機しつつ進捗を追い、**CI が success** になるのを確認する（MCP: `actions_get get_workflow_run` / `actions_list list_workflow_jobs`、gh: `gh run view <run_id>` / `gh run watch <run_id>`）。
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
