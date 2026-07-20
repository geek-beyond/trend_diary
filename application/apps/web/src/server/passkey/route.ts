import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import passkeyAuthenticationOptions from './handler/authentication-options'
import passkeyAuthenticationVerify, {
  passkeyAuthenticationVerifyValidator,
} from './handler/authentication-verify'
import passkeyDisable from './handler/disable'
import passkeyRegistrationOptions from './handler/registration-options'
import passkeyRegistrationVerify, {
  passkeyRegistrationVerifyValidator,
} from './handler/registration-verify'
import passkeyStatus from './handler/status'

const app = new Hono<Env>()
  // passkey認証(未認証で可)。ブラウザのWebAuthn ceremonyを挟むためoptions/verifyの2段構え
  .post('/authentication/options', rateLimiter, passkeyAuthenticationOptions)
  .post(
    '/authentication/verify',
    rateLimiter,
    passkeyAuthenticationVerifyValidator,
    passkeyAuthenticationVerify,
  )
  // passkey登録(要認証)。ログイン中ユーザーが自分のpasskeyを登録する
  .post('/registration/options', authenticator, passkeyRegistrationOptions)
  .post(
    '/registration/verify',
    authenticator,
    passkeyRegistrationVerifyValidator,
    passkeyRegistrationVerify,
  )
  // passkey管理(要認証)。設定画面のトグルが登録状態の取得と無効化に使う
  .get('/', authenticator, passkeyStatus)
  .delete('/', authenticator, passkeyDisable)

export default app
