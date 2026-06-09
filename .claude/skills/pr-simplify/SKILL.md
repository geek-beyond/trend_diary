---
name: pr-simplify
description: GitHub Pull Requestのレビューコメント対応を、修正実装・検証・コミット・コメント返信・スレッド解決・simplifyまで一気通貫で実行する。『PRのレビュー修正』『レビューコメントにコミットID返信』『PR出したらsimplify』の依頼で使う。
---

# PR Simplify

## 実行フロー

1. 対象PRを特定し、未解決レビューコメントだけを抽出する。
2. コメント内容に対応するコード修正と必要なテスト追加を行う。
3. リポジトリ規約に従って format/lint/test/CI相当コマンドを実行する。
4. 変更をコミットして push する。
5. 対応した各レビューコメントに、コミットID付きで返信する。
6. 対応済みスレッドを resolve する。
7. `/simplify` を実行して、push した変更を simplify する。

## 1) 未解決コメントの抽出

- `gh pr view <PR番号> --json number,title,headRefName,baseRefName`
- `gh api graphql` で `reviewThreads` を取得し、`isResolved == false` を対象にする。
- 返信先は `pulls/{pull_number}/comments/{comment_id}/replies` を使う。

実用コマンド例（未解決だけ抽出）:

```bash
gh api graphql -f query='query($owner:String!, $name:String!, $number:Int!){ repository(owner:$owner, name:$name){ pullRequest(number:$number){ reviewThreads(first:100){ nodes{ id isResolved comments(first:20){ nodes{ databaseId body path line originalLine url author{login} } } } } } } }' \
  -f owner=<owner> -f name=<repo> -F number=<pr_number> \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved==false) | {threadId:.id, comment:(.comments.nodes[-1])}'
```

## 2) 修正実装

- 指摘の「事実」と「期待動作」を分離してから修正する。
- 仕様変更が必要なら既存テストを先に更新し、その後に実装を合わせる。
- 既存設計に沿って最小差分で直す。

## 3) 検証

- プロジェクトの規約ファイル（例: `AGENTS.md`）を優先する。
- 指定がある場合は `format` / `lint` / `test` / CI関連コマンドをすべて実行する。
- 失敗時は原因を切り分け、再実行して結果を確定させる。

## 4) コミット・push

- 変更ファイルだけ `git add` する。
- 何を直したかが分かる1コミット以上で記録する。
- `git push` でPRブランチに反映する。

## 5) コメント返信（コミットID必須）

- 各レビューコメントに次の形式で返信する。
- 返信例: `対応した。コミット: <short_sha>`

コマンド例:

```bash
gh api -X POST repos/<owner>/<repo>/pulls/<pr_number>/comments/<comment_id>/replies \
  -f body='対応した。コミット: <short_sha>'
```

実用コマンド例（複数コメントへ一括返信）:

```bash
for id in <comment_id_1> <comment_id_2> <comment_id_3>; do
  gh api -X POST repos/<owner>/<repo>/pulls/<pr_number>/comments/$id/replies \
    -f body='対応した。コミット: <short_sha>' >/dev/null
  echo "replied:$id"
done
```

## 6) スレッドresolve

- 返信後、対応済みスレッドを resolve する。

コマンド例:

```bash
gh api graphql -f query='mutation ResolveReviewThread($threadId:ID!){ resolveReviewThread(input:{threadId:$threadId}){ thread{ id isResolved } } }' \
  -f threadId=<thread_id>
```

実用コマンド例（複数スレッドを一括resolve）:

```bash
for thread in <thread_id_1> <thread_id_2> <thread_id_3>; do
  gh api graphql -f query='mutation ResolveReviewThread($threadId:ID!){ resolveReviewThread(input:{threadId:$threadId}){ thread{ id isResolved } } }' \
    -f threadId=$thread >/dev/null
  echo "resolved:$thread"
done
```

## 7) simplify（必須）

- レビュー修正が一通り終わったら、`/simplify` を実行して push した変更を simplify する。
  - `/code-review` の指摘のうち simplify 対象（過剰設計 / YAGNI 違反）を最小コード変更で解消する。
  - 詳細は `simplify` スキルを参照。
- simplify で追加の修正が入った場合は、3)〜4) と同様に format/lint/test を再実行してから commit/push する。
- 完了後、未解決スレッド数と CI チェック状況を確認する。

確認コマンド例:

```bash
# 未解決スレッド数
gh api graphql -f query='query($owner:String!, $name:String!, $number:Int!){ repository(owner:$owner,name:$name){ pullRequest(number:$number){ reviewThreads(first:100){ nodes{ isResolved } } } } }' \
  -f owner=<owner> -f name=<repo> -F number=<pr_number> \
  --jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved==false)] | length'

# CIチェック状況
gh pr checks <pr_number>
```
