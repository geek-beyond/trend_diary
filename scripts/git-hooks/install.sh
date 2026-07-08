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
# include.path は複数値を取れるキーのため、既存値の上書きを避けて --add で追加し、再実行時の重複登録も防ぐ
if ! git config --local --get --fixed-value include.path ../.gitconfig-hooks > /dev/null; then
  git config --local --add include.path ../.gitconfig-hooks
fi

echo "フックを有効化しました（pre-commit: lint / pre-push: 単体テスト）。"
echo "スキップ・無効化の方法: docs/how_to_guides/git_hooks_setup.md"
