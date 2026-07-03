import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../env'

// passkey機能はフラグでゲートする。無効時は機能自体を隠すため404で応答する。
const passkeyGate = createMiddleware<Env>(async (c, next) => {
  if (c.env.PASSKEY_ENABLED !== 'true') {
    throw new HTTPException(404, { message: 'passkey is not enabled' })
  }

  return next()
})

export default passkeyGate
