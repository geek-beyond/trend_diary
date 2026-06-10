---
paths:
  - "**/*"
---

# リリース手順規約

リリースを行う際は、以下の手順を上から順に必ず実施する。手順を飛ばさず、各ステップの完了を確認してから次へ進む。

## 手順

1. **CHANGELOG の更新**
   - 今回のリリースに含まれる変更内容を `CHANGELOG.md` に追記する
   - 新しいバージョン番号・日付・主要な変更点（追加 / 変更 / 修正など）を記載する

2. **バージョンタグの作成**
   - CHANGELOG に記載したバージョンと一致するタグを打つ（例: `git tag vX.Y.Z`）
   - タグはリモートにも push する（例: `git push origin vX.Y.Z`）
   - 理由: リリース時点のコードを後から特定・追跡できるようにするため

3. **デプロイ（`wrangler deploy`）**
   - 対象パッケージ（`packages/web` / `packages/cron`）で `wrangler deploy` を実行する
   - 各パッケージの `deploy` スクリプト（例: `pnpm --filter @trend-diary/cron run deploy`）を利用してもよい
   - デプロイが成功したことを必ず確認する

4. **Discord への完了通知**
   - 上記が完了したら、最後に Discord へリリース完了通知を送る
   - 既存の通知基盤（`packages/notification` の `DiscordWebhookClient` / `DISCORD_WEBHOOK_URL`）を利用する
   - 通知には対象バージョン・デプロイ対象などリリース内容がわかる情報を含める

## 注意

- 上記は「CHANGELOG 更新 → バージョンタグ → `wrangler deploy` → Discord 通知」の順序を厳守する
- いずれかのステップが失敗した場合は、原因を解消してから後続のステップに進む（通知だけが先行して送られることがないようにする）
