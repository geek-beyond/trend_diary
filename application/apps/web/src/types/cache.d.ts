// DOM lib の CacheStorage には Cloudflare Workers 固有の caches.default が無いため、型を補う
interface CacheStorage {
  readonly default: Cache
}
