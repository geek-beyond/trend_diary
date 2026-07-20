import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import passkeyDisable from './handler/disable'
import passkeyLoginStart from './handler/login-start'
import passkeyLoginVerify, { passkeyLoginVerifyValidator } from './handler/login-verify'
import passkeyRegisterStart from './handler/register-start'
import passkeyRegisterVerify, { passkeyRegisterVerifyValidator } from './handler/register-verify'
import passkeyStatus from './handler/status'

const app = new Hono<Env>()
  // passkey認証(未認証で可)。ブラウザのWebAuthn ceremonyを挟むためstart/verifyの2段構え
  .post('/login', rateLimiter, passkeyLoginStart)
  .post('/login/verify', rateLimiter, passkeyLoginVerifyValidator, passkeyLoginVerify)
  // passkey登録(要認証)。ログイン中ユーザーが自分のpasskeyを登録する
  .post('/register', authenticator, passkeyRegisterStart)
  .post('/register/verify', authenticator, passkeyRegisterVerifyValidator, passkeyRegisterVerify)
  // passkey管理(要認証)。設定画面のトグルが登録状態の取得と無効化に使う
  .get('/', authenticator, passkeyStatus)
  .delete('/', authenticator, passkeyDisable)

export default app
