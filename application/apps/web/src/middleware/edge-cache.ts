// Cloudflare Workers のエッジキャッシュ（コロローカルの caches.default）へのアクセスを一箇所に集約する。
// Workers ランタイム外（テストの node 環境など）では caches が存在しないため、その場合は undefined を返す
export function getEdgeCache(): Cache | undefined {
  if (typeof caches === 'undefined') return undefined
  // クライアントと共有する tsconfig が DOM lib を含むため、caches は Cloudflare 拡張の default を持たない DOM 型に解決される。
  // 実行時には存在する Workers 固有のプロパティへアクセスする
  // oxlint-disable-next-line typescript/consistent-type-assertions -- Workers ランタイム固有の caches.default へアクセスするため
  return (caches as unknown as { default: Cache }).default
}
