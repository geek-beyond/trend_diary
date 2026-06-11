import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { Env } from '../env'

// hono/csrfはフォーム系Content-Typeしか検査しないため、action経由でJSONへ変換された
// フォーム由来のリクエスト（ログインCSRF）が素通りしてしまう。認証エンドポイントでは
// Content-Typeに依らず、ブラウザが付与するSec-Fetch-Site / Originで同一オリジンを強制する
const sameOriginGuard = createMiddleware<Env>(async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') {
    return next()
  }

  const isSameOrigin =
    c.req.header('Sec-Fetch-Site') === 'same-origin' ||
    c.req.header('Origin') === new URL(c.req.url).origin

  if (!isSameOrigin) {
    throw new HTTPException(403, { message: 'forbidden' })
  }

  return next()
})

export default sameOriginGuard
