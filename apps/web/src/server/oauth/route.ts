import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import oauthCallback from './handler/callback'
import oauthLink from './handler/link'
import oauthLogin from './handler/login'
import oauthStatus from './handler/status'
import oauthUnlink from './handler/unlink'
import {
  oauthCallbackQueryValidator,
  oauthLoginQueryValidator,
  oauthProviderParamValidator,
} from './schema'

const app = new Hono<Env>()
  // OAuth(未認証で可)。認可はSupabase経由でプロバイダへ委譲し、callbackでセッションを確立する。
  // ブラウザのトップレベル遷移で往復するためGETで受ける。対応外プロバイダはparam検証で422に落とす
  .get(
    '/:provider/login',
    rateLimiter,
    oauthProviderParamValidator,
    oauthLoginQueryValidator,
    oauthLogin,
  )
  .get(
    '/:provider/callback',
    rateLimiter,
    oauthProviderParamValidator,
    oauthCallbackQueryValidator,
    oauthCallback,
  )
  .get('/:provider/link', authenticator, oauthProviderParamValidator, oauthLink)
  .get('/:provider', authenticator, oauthProviderParamValidator, oauthStatus)
  .delete('/:provider', authenticator, oauthProviderParamValidator, oauthUnlink)

export default app
