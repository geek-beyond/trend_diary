---
name: e2e-debug-playwright
description: PlaywrightのE2E失敗・flakyをローカル/CIの両方で切り分けて修正する。PRのDiff実行（--only-changed）を維持しつつ、終了コード判定の不整合、GitHub Actions失敗、artifact/trace解析、再現性確認が必要なときに使う。
---

# E2E Debug Playwright

## Overview

Playwright E2Eの「落ちるべきときに落ちる」状態を担保しながら、flakyの根因を潰すための実行手順を定義する。
`--only-changed` を崩さずに、CIとローカルを同じ条件で検証する。

## 1. ローカルで同条件再現する

最初に静的チェックを通す:

```bash
pnpm run lint
pnpm run check
```

次にCI相当コマンドを実行する:

```bash
pnpm --filter @trend-diary/e2e test \
  --reporter=line \
  --only-changed=origin/main \
  --pass-with-no-tests \
  --fail-on-flaky-tests
```

失敗シナリオを絞って連続実行する:

```bash
pnpm --filter @trend-diary/e2e test src/scenario/signup-basic.test.ts \
  --project=chromium \
  --repeat-each=5 \
  --retries=0 \
  --reporter=line
```

## 2. CIを監視して失敗情報を集める

run特定:

```bash
gh run list --branch <branch> --workflow e2e.yaml --limit 5
gh run watch <run_id> --exit-status
```

ログ抽出:

```bash
gh run view <run_id> --job <job_id> --log
```

`gh` APIエラー時はartifactを優先する:

```bash
mkdir -p artifacts/run-<run_id>
gh run download <run_id> -n playwright-test-results-diff-<run_id>-1 -D artifacts/run-<run_id>
```

## 3. artifactで画面状態遷移を読む

必ず見る:
- `error-context.md`
- `test-failed-1.png`
- `video.webm`

確認ポイント:
- どの画面で止まっているか（`/signup` or `/login` or `/trends`）
- ボタン状態（例: `ログイン中...` でdisabled）
- 入力値がDOMに反映されているか

必要に応じてtrace内ネットワークを確認:

```bash
unzip -p <trace.zip> 0-trace.network | rg "/api/v2/auth/"
```

## 4. 原因別に修正する

- selector曖昧: strict mode violationを解消するため、roleと領域を絞る
- API待機フレーク: `waitForResponse`依存を減らし、URL/表示状態中心に判定する
- 遷移が遅い: `toPass`のタイムアウトをシナリオ単位で延長する
- 環境変数不備: `SUPABASE_URL` / `SUPABASE_ANON_KEY` の注入経路を確認する

## 5. 修正ループを回す

毎ループで実行する:
1. `pnpm run lint`
2. `pnpm run check`
3. CI相当の差分E2Eコマンド
4. 必要なら対象シナリオの`--repeat-each`
5. commit/push
6. `gh run watch`で結果確認

終了条件:
- Diff actionがエラー時に確実に失敗する
- Diff action上のE2Eエラーが消える
