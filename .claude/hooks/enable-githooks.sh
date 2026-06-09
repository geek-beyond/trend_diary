#!/bin/bash
set -euo pipefail
#
# SessionStart hook: .githooks を有効化する。
# これにより push 時に .githooks/pre-push が走り、差分へ /simplify が自動実行される。
# Claude Code セッション専用の有効化（人間の手動セットアップは不要）。冪等。
#
cd "${CLAUDE_PROJECT_DIR:-.}"
git config core.hooksPath .githooks
