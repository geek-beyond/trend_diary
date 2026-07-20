import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import captcha from '@/middleware/captcha'
import rateLimiter from '@/middleware/rate-limiter'
import login from './handler/login'
import logout from './handler/logout'
import me from './handler/me'
import passkeyDisable from './handler/passkey-disable'
import passkeyLoginStart from './handler/passkey-login-start'
import passkeyLoginVerify, { passkeyLoginVerifyValidator } from './handler/passkey-login-verify'
import passkeyRegisterStart from './handler/passkey-register-start'
import passkeyRegisterVerify, {
  passkeyRegisterVerifyValidator,
} from './handler/passkey-register-verify'
import passkeyStatus from './handler/passkey-status'
import signup from './handler/signup'
import { authInputValidator } from './validators'

const app = new Hono<Env>()
  .post('/signup', rateLimiter, authInputValidator, captcha, signup)
  .post('/login', rateLimiter, authInputValidator, captcha, login)
  .delete('/logout', logout)
  .get('/me', authenticator, me)
  // passkey認証(未認証で可)。ブラウザのWebAuthn ceremonyを挟むためstart/verifyの2段構え
  .post('/passkey/login/start', rateLimiter, passkeyLoginStart)
  .post('/passkey/login/verify', rateLimiter, passkeyLoginVerifyValidator, passkeyLoginVerify)
  // passkey登録(要認証)。ログイン中ユーザーが自分のpasskeyを登録する
  .post('/passkey/register/start', authenticator, passkeyRegisterStart)
  .post(
    '/passkey/register/verify',
    authenticator,
    passkeyRegisterVerifyValidator,
    passkeyRegisterVerify,
  )
  // passkey管理(要認証)。設定画面のトグルが登録状態の取得と無効化に使う
  .get('/passkey', authenticator, passkeyStatus)
  .delete('/passkey', authenticator, passkeyDisable)

export default app
