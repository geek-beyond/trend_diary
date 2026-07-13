---
paths:
  - "**/web/src/client/**/*.{ts,tsx}"
---

# レイアウト・高さ規約

- `app-layout`（ヘッダーあり）配下のページの最上位要素に `min-h-screen` / `min-h-dvh` などのビューポート基準の最小高さを付けない。残り高さを埋めたい場合は `flex-1` を使う
  - 理由: `app-layout` は縦 flex（`flex min-h-dvh flex-col`）でヘッダー（`h-16`）を先頭に積むため、配下ページに `min-h-screen`（`100vh`）を付けるとヘッダーの高さ分だけビューポートをはみ出し、内容が収まっていても不要なスクロールバーが出る。`flex-1` なら親の残り高さにフィットしてはみ出さない
  - 対象: `app-layout.tsx` の `Outlet` 配下に描画されるページ（`/trends` `/inbox` `/diary` `/analytics` `/settings` 等）。これらが直接持つラッパー、および `DiaryPageLayout` のような共有ページラッパーを含む
  - 例外: `app-layout` の外に描画されるページ（`/` `/login` `/signup` `/privacy-policy` `/terms-of-service`）はヘッダーが無く、最上位要素の `min-h-screen` が正しい。ここでは `flex-1` にしない
