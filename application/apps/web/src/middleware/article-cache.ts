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

// Hono が生成する c.res のヘッダは可変のため、新たな Response を生成せず直接書き換える。
// Set-Cookie が混ざると共有キャッシュに載せられず、他ユーザーへ Cookie が漏れる恐れもあるため除去する
function toCacheableResponse(res: Response): Response {
  res.headers.set('Cache-Control', `public, s-maxage=${ARTICLE_CACHE_TTL_SECONDS}`)
  res.headers.delete('Set-Cookie')
  return res
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

  const response = toCacheableResponse(c.res)
  // body は一度しか読めないため、clone して保存用と応答用に分ける
  const putPromise = cache.put(cacheKey, response.clone())
  try {
    c.executionCtx.waitUntil(putPromise)
  } catch {
    // ExecutionContext が提供されない環境では保存完了を待ってから応答する
    await putPromise
  }
})

export default articleCache
