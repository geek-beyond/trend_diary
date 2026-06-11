---
paths:
  - "**/web/src/client/**/*.{ts,tsx}"
---

# React規約

React 19.2 + React Compiler 有効（`packages/web` の Vite で `babel-plugin-react-compiler` を適用済み）を前提とする。

## useEffect

`useEffect` は「外部システムとの同期」のための仕組みであり、それ以外の用途に使わない。レンダー中の派生計算やイベント起因の処理を Effect に載せると、再レンダーの往復や状態の二重管理を生み、バグの温床になる。判断に迷う場合は React 公式「[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)」を参照する。

- props や他の state から計算できる値は、Effect で state に同期せずレンダー中に算出する
  - 理由: 同期 Effect は派生値を二重に持つことになり、元の値と state がずれる余地を生む。レンダー中の計算なら常に最新で一貫する
- props の変化に応じて子の内部 state をリセットしたいときは、Effect ではなく `key` で再マウントする
  - 理由: `key` を渡せばリセットの意図が宣言的に表れ、リセット漏れや余計な再レンダーを避けられる
- 「特定の操作の結果起きること」（スクロール・演出の発火・mutate 等）は Effect ではなくイベントハンドラに置く
  - 理由: イベント起因の処理を Effect に載せると、何の操作で発火したのか追えなくなり、依存配列や追跡用 ref で状態を補う複雑さが生じる。ハンドラ内に置けば因果が明確で二重実行も防げる

### 残してよい useEffect

外部システムとの同期は Effect が本来の用途のため、無理に置き換えない。

- 外部スクリプトの読込・描画、`setTimeout` タイマー、キーボードショートカットの購読など
- 外部ストアの値を購読するだけのもの（`matchMedia` や `visibilitychange` 等）は、可能なら `useSyncExternalStore` を優先する
  - 理由: SSR との整合が取れ、初回レンダー後のちらつきを避けられる。Effect での購読は描画後に値が確定するため一瞬ずれる余地がある
