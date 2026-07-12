import {
  authInputSchema,
  passkeyVerifyInputSchema,
  themeUpdateSchema,
} from '@trend-diary/domain/user'
import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import zodValidator from '@/middleware/zod-validator'
import login from './handler/login'
import logout from './handler/logout'
import me from './handler/me'
import updateTheme from './handler/update-theme'
import passkeyDisable from './handler/passkey-disable'
import passkeyLoginStart from './handler/passkey-login-start'
import passkeyLoginVerify from './handler/passkey-login-verify'
import passkeyRegisterStart from './handler/passkey-register-start'
import passkeyRegisterVerify from './handler/passkey-register-verify'
import passkeyStatus from './handler/passkey-status'
import signup from './handler/signup'

const app = new Hono<Env>()
  .post('/signup', rateLimiter, zodValidator('json', authInputSchema), signup)
  .post('/login', rateLimiter, zodValidator('json', authInputSchema), login)
  .delete('/logout', logout)
  .get('/me', authenticator, me)
  // 端末間で共有するテーマ設定の更新(要認証)
  .put('/me/theme', authenticator, zodValidator('json', themeUpdateSchema), updateTheme)
  // passkey認証(未認証で可)。ブラウザのWebAuthn ceremonyを挟むためstart/verifyの2段構え
  .post('/passkey/login/start', rateLimiter, passkeyLoginStart)
  .post(
    '/passkey/login/verify',
    rateLimiter,
    zodValidator('json', passkeyVerifyInputSchema),
    passkeyLoginVerify,
  )
  // passkey登録(要認証)。ログイン中ユーザーが自分のpasskeyを登録する
  .post('/passkey/register/start', authenticator, passkeyRegisterStart)
  .post(
    '/passkey/register/verify',
    authenticator,
    zodValidator('json', passkeyVerifyInputSchema),
    passkeyRegisterVerify,
  )
  // passkey管理(要認証)。設定画面のトグルが登録状態の取得と無効化に使う
  .get('/passkey', authenticator, passkeyStatus)
  .delete('/passkey', authenticator, passkeyDisable)

export default app
