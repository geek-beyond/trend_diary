#!/usr/bin/env bash
set -euo pipefail

# push 前の最終ゲートとして、CI の高速ジョブ（code-quality / unit-test）を先回りして実行する。
# web・e2e のテストは Supabase や Playwright の起動が必要で push のたびに待てないため CI に委ねる。
cd "$(git rev-parse --show-toplevel)/application"

# CI（ci.yaml の env.DATABASE_URL）と同じ値に揃える
export DATABASE_URL="${DATABASE_URL:-file:./test.db}"

echo "[pre-push] lint（typecheck 含む）を実行します"
pnpm lint

echo "[pre-push] packages/* の単体テストを実行します"
pnpm --filter "./packages/*" test

echo "[pre-push] すべて成功しました（スキップしたい場合: git push --no-verify）"
