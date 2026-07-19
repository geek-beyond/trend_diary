import { oauthCallbackQuerySchema, oauthLoginQuerySchema } from '@trend-diary/domain/account'
import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import zodValidator from '@/middleware/zod-validator'
import oauthCallback from './handler/callback'
import oauthLink from './handler/link'
import oauthLogin from './handler/login'
import oauthStatus from './handler/status'
import oauthUnlink from './handler/unlink'
import { oauthProviderParamSchema } from './schema'

const app = new Hono<Env>()
  // OAuth(未認証で可)。認可はSupabase経由でプロバイダへ委譲し、callbackでセッションを確立する。
  // ブラウザのトップレベル遷移で往復するためGETで受ける。対応外プロバイダはparam検証で422に落とす
  .get(
    '/:provider/login',
    rateLimiter,
    zodValidator('param', oauthProviderParamSchema),
    zodValidator('query', oauthLoginQuerySchema),
    oauthLogin,
  )
  .get(
    '/:provider/callback',
    rateLimiter,
    zodValidator('param', oauthProviderParamSchema),
    zodValidator('query', oauthCallbackQuerySchema),
    oauthCallback,
  )
  .get('/:provider/link', authenticator, zodValidator('param', oauthProviderParamSchema), oauthLink)
  .get('/:provider', authenticator, zodValidator('param', oauthProviderParamSchema), oauthStatus)
  .delete('/:provider', authenticator, zodValidator('param', oauthProviderParamSchema), oauthUnlink)

export default app
