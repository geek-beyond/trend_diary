import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../env'
import CONTEXT_KEY, { mustGet } from './context'

// IP単位でブルートフォース・大量試行を抑止するため、認証系エンドポイントに適用する
const rateLimiter = createMiddleware<Env>(async (c, next) => {
  const limiter = c.env.AUTH_RATE_LIMITER

  // 本番では常にバインディングが設定されるため、未設定時（ローカル開発等）は制限をスキップする
  if (!limiter) {
    return next()
  }

  // パスごとに別カウンタとし、login/signupを独立して制限する
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const key = `${c.req.path}:${ip}`

  try {
    const { success } = await limiter.limit({ key })
    if (!success) {
      throw new HTTPException(429, { message: 'too many requests' })
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }

    // 認証エンドポイントでは無制限なブルートフォースを許す方が危険なため、Rate Limiting API障害時は
    // フェイルオープンせずフェイルセーフ（503）に倒す。障害の継続はこのerrorログとerrorHandlerの5xx通知で検知する
    mustGet(c, CONTEXT_KEY.APP_LOG).error(
      {
        msg: 'rate limiter unavailable, failing closed',
        event: 'rate_limiter_fail_closed',
        path: c.req.path,
      },
      error instanceof Error ? error : new Error(String(error)),
    )

    // 根本原因をerrorHandler側の通知にも残すためcauseに連鎖させる
    throw new HTTPException(503, { message: 'service temporarily unavailable', cause: error })
  }

  return next()
})

export default rateLimiter
