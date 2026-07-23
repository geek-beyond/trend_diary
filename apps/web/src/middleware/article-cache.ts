import { createMiddleware } from 'hono/factory'
import type { Env } from '../env'

// cron が毎時更新のため、数分の鮮度遅延は実害が小さい。D1 負荷とレイテンシの削減を優先して 5 分とする
export const ARTICLE_CACHE_TTL_SECONDS = 300

// Supabase のセッション Cookie はこの接頭辞を持つ。存在する場合はユーザー依存（isRead 付与）の応答になり得るためキャッシュしない
const SESSION_COOKIE_PREFIX = 'sb-'

function hasSessionCookie(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false
  return cookieHeader
    .split(';')
    .some((cookie) => cookie.trimStart().startsWith(SESSION_COOKIE_PREFIX))
}

/**
 * 未ログインの記事一覧レスポンスをエッジキャッシュする。
 * - ユーザー依存になり得るセッション Cookie 付きリクエストは素通しする
 * - GET かつ 200 応答のみを対象とする
 */
const articleCache = createMiddleware<Env>(async (c, next) => {
  // 本番は常時有効。共有エッジキャッシュがテスト間の分離を壊す E2E 等でのみ EDGE_CACHE_DISABLED で無効化する
  if (c.env.EDGE_CACHE_DISABLED === 'true') return next()

  if (c.req.method !== 'GET' || hasSessionCookie(c.req.header('Cookie'))) {
    return next()
  }

  const cache = caches.default
  // Cookie の有無で応答が変わるため、キャッシュキーは URL のみで構成し Cookie 等のヘッダは含めない
  const cacheKey = new Request(c.req.url, { method: 'GET' })

  const hit = await cache.match(cacheKey)
  // Cache API が返す Response はヘッダが immutable のため、素通しすると後続の secureHeaders 等が
  // ヘッダを変更できず落ちる。可変なヘッダを持つ Response に作り直して返す
  if (hit) return new Response(hit.body, hit)

  await next()

  if (c.res.status !== 200) return

  // Set-Cookie が混ざると共有キャッシュに載せられず Cookie 漏洩の恐れもあるため除去し、TTL を付与する
  c.res.headers.set('Cache-Control', `public, s-maxage=${ARTICLE_CACHE_TTL_SECONDS}`)
  c.res.headers.delete('Set-Cookie')

  // body は一度しか読めないため clone し、応答返却後も put が中断されないよう waitUntil で完了を保証する
  c.executionCtx.waitUntil(cache.put(cacheKey, c.res.clone()))
})

export default articleCache
