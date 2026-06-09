#!/bin/bash
set -euo pipefail
#
# SessionStart hook: .githooks を有効化する。
# これにより push 時に .githooks/pre-push が走り、差分へ /simplify が自動実行される。
# `mise run setup-hooks` と同等のワンコマンドを、セッション開始時に自動で行う。冪等。
#
cd "${CLAUDE_PROJECT_DIR:-.}"
git config core.hooksPath .githooks
