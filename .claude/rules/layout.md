---
paths:
  - "**/web/src/client/**/*.{ts,tsx}"
---

# レイアウト・高さ規約

- `app-layout`（ヘッダーあり）配下のページは、最上位要素を自前で組まず共通コンポーネントを使う
  - 背景＋余白の外枠だけが必要なページ（一覧など）は `PageContainer`（`components/ui/layout/page-container`）を使う
  - 中央寄せカード＋見出しが必要なページは `PageCard`（`components/ui/layout/page-card`）を使う
  - 理由: 高さ・背景・余白の指定を1箇所に集約し、ページごとに書き分けて生じるズレ（特に下記スクロールバグ）を防ぐため
- これらのラッパーに `min-h-screen` / `min-h-dvh` などビューポート基準の最小高さを付けない。残り高さは `PageContainer` が持つ `flex-1` に任せる
  - 理由: `app-layout` は縦 flex（`flex min-h-dvh flex-col`）でヘッダー（`h-16`）を先頭に積むため、配下ページに `min-h-screen`（`100vh`）を付けるとヘッダーの高さ分だけビューポートをはみ出し、内容が収まっていても不要なスクロールバーが出る。`flex-1` なら親の残り高さにフィットしてはみ出さない
- 例外: `app-layout` の外に描画されるページ（`/` `/login` `/signup` `/privacy-policy` `/terms-of-service`）はヘッダーが無く、最上位要素の `min-h-screen` が正しい。ここでは `PageContainer` / `flex-1` を使わない
