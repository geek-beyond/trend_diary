# Gitフック（pre-commit / pre-push）の有効化

commit・push の前に CI の高速ジョブ相当をローカルで自動実行し、CI の失敗を待たずに手元で検知するためのフックです。git 2.54 で導入された config-based hooks（`hook.*` 設定）を使っており、`.git/hooks/` へのスクリプト配置や husky 等のフックマネージャーは不要です。

## 前提

- **git 2.54 以上**（`git version` で確認。`hook.*` 設定は 2.54 未満では無視され、フックは一切動作しません）
  - macOS: `brew upgrade git`

## 有効化（初回のみ）

リポジトリルートで以下を実行します。

```sh
./scripts/git-hooks/install.sh
```

これは追跡ファイル [`.gitconfig-hooks`](../../.gitconfig-hooks) を `include.path` としてローカル設定に取り込みます。以降のフック定義の変更は追跡ファイル側で行われるため、pull するだけで反映されます。

## 実行される内容

| タイミング | スクリプト | 内容 | 相当する CI ジョブ |
| --- | --- | --- | --- |
| `git commit` | [`pre-commit.sh`](../../scripts/git-hooks/pre-commit.sh) | `pnpm lint`（oxlint / oxfmt / typecheck） | code-quality |
| `git push` | [`pre-push.sh`](../../scripts/git-hooks/pre-push.sh) | `pnpm --filter "./packages/*" test` | unit-test |

web・e2e のテストは Supabase や Playwright の起動が必要で push のたびに実行するには重いため、CI に委ねています。

## スキップ・無効化

```sh
# 一時的にスキップ（WIP のcommit・push等）
git commit --no-verify
git push --no-verify

# 恒久的に無効化（定義は残したまま自分の環境でのみオフ）
git config --local hook.pre-commit-lint.enabled false
git config --local hook.pre-push-test.enabled false

# 再度有効化
git config --local --unset hook.pre-commit-lint.enabled
git config --local --unset hook.pre-push-test.enabled
```

## 仕組み（参考）

git 2.54 から、フックを設定ファイルで宣言できるようになりました。

```ini
[hook "pre-commit-lint"]
	event = pre-commit
	command = ./scripts/git-hooks/pre-commit.sh
```

- 同一イベントに複数フックを割り当てられ、設定の出現順に逐次実行されます（並列実行は 2.55 で `hook.jobs` として導入予定）
- git はセキュリティ上、リポジトリ内の追跡ファイルを設定として自動では読み込まないため、初回のみ `install.sh` による opt-in（`include.path` の登録）が必要です
