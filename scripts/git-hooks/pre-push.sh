#!/usr/bin/env bash
set -euo pipefail

# push 前の最終ゲートとして、CI の unit-test ジョブ相当を先回りして実行する。
# lint は pre-commit 側で担保する。web・e2e のテストは Supabase や Playwright の
# 起動が必要で push のたびに待てないため CI に委ねる。

# 削除 push（local_sha が全ゼロ）にはテストすべきコミットが無いためスキップする
zero_sha="0000000000000000000000000000000000000000"
has_update=""
while read -r _local_ref local_sha _remote_ref _remote_sha; do
  if [ "$local_sha" != "$zero_sha" ]; then
    has_update=1
  fi
done
if [ -z "$has_update" ]; then
  exit 0
fi

cd "$(git rev-parse --show-toplevel)"

echo "[pre-push] packages/* の単体テストを実行します（スキップ: git push --no-verify）"
pnpm --filter "./packages/*" test
