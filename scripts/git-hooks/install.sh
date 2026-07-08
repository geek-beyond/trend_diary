#!/usr/bin/env bash
set -euo pipefail

# config-based hooks（hook.* 設定）は git 2.54 で導入されたため、それ未満では有効化しても一切動作しない
required="2.54.0"
current="$(git version | awk '{print $3}')"
if [ "$(printf '%s\n' "$required" "$current" | sort -V | head -n1)" != "$required" ]; then
  echo "エラー: git ${required} 以上が必要です（現在: ${current}）。git を更新してから再実行してください。" >&2
  exit 1
fi

# 追跡ファイル .gitconfig-hooks を include することで、フック定義の変更が pull だけで反映される
# （パスは .git/config からの相対参照のためリポジトリルートを指す）
git config --local include.path ../.gitconfig-hooks

echo "フックを有効化しました（pre-commit: lint / pre-push: 単体テスト）。"
echo "  一時的にスキップ: git commit --no-verify / git push --no-verify"
echo "  恒久的に無効化:   git config --local hook.pre-commit-lint.enabled false"
echo "                    git config --local hook.pre-push-test.enabled false"
