#!/usr/bin/env bash
set -euo pipefail

# commit のたびに CI の code-quality ジョブ相当を先回りして実行する。
# typecheck 込みでも数秒〜十数秒で終わるため commit 単位のゲートに置いている。
cd "$(git rev-parse --show-toplevel)"

echo "[pre-commit] lint（typecheck 含む）を実行します（スキップ: git commit --no-verify）"
pnpm lint
