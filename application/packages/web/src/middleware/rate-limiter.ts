import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { Env } from '../env'
import CONTEXT_KEY from './context'

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

    // Rate Limiting API自体の障害で認証を止めないよう、フェイルオープンする
    c.get(CONTEXT_KEY.APP_LOG)?.warn('rate limiter unavailable, failing open', error)
  }

  return next()
})

export default rateLimiter
