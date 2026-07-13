// クライアントと共有する tsconfig の DOM lib が caches.default（Cloudflare 拡張）の型を隠すため
export function getEdgeCache(): Cache {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- caches.default は Workers ランタイム固有
  return (caches as CacheStorage & { default: Cache }).default
}
