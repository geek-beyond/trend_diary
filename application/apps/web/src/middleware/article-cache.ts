import { createMiddleware } from 'hono/factory'
import type { Env } from '../env'
import { getEdgeCache } from './edge-cache'

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
  const cache = getEdgeCache()
  // ランタイム外や非対象リクエストは素通しする
  if (!cache || c.req.method !== 'GET' || hasSessionCookie(c.req.header('Cookie'))) {
    return next()
  }

  // Cookie の有無で応答が変わるため、キャッシュキーは URL のみで構成し Cookie 等のヘッダは含めない。
  // c.req.url は既に絶対 URL 文字列のため再パースは不要
  const cacheKey = new Request(c.req.url, { method: 'GET' })

  const hit = await cache.match(cacheKey)
  if (hit) return hit

  await next()

  if (c.res.status !== 200) return

  // 生ストリームを tee して保存すると保存側 body が切り詰められる実装（miniflare 等）があるため、一度バッファへ読み切る
  const body = await c.res.arrayBuffer()
  // Set-Cookie が混ざると共有キャッシュに載せられず Cookie 漏洩の恐れもあるため除去し、TTL を付与する
  const headers = new Headers(c.res.headers)
  headers.set('Cache-Control', `public, s-maxage=${ARTICLE_CACHE_TTL_SECONDS}`)
  headers.delete('Set-Cookie')

  const response = new Response(body, { status: c.res.status, headers })
  // バッファ由来なら clone しても双方が完全な body を持つ。応答返却後も put が中断されないよう waitUntil で完了を保証する
  c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()))
  c.res = response
})

export default articleCache
