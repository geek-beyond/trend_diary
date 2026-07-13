// caches.default は Cloudflare 拡張だが、クライアントと共有する tsconfig が DOM lib を含むため型に現れない。実行時に存在する Workers 固有プロパティを補って参照する
export function getEdgeCache(): Cache {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- Workers ランタイム固有の caches.default へアクセスするため
  return (caches as CacheStorage & { default: Cache }).default
}
