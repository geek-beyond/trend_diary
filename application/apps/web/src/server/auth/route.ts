import {
  authInputSchema,
  oauthCallbackQuerySchema,
  oauthLoginQuerySchema,
  passkeyVerifyInputSchema,
} from '@trend-diary/domain/user'
import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import zodValidator from '@/middleware/zod-validator'
import login from './handler/login'
import logout from './handler/logout'
import me from './handler/me'
import oauthGithubCallback from './handler/oauth-github-callback'
import oauthGithubLink from './handler/oauth-github-link'
import oauthGithubLogin from './handler/oauth-github-login'
import oauthGithubStatus from './handler/oauth-github-status'
import oauthGithubUnlink from './handler/oauth-github-unlink'
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
  // GitHub OAuth(未認証で可)。認可はSupabase経由でGitHubへ委譲し、callbackでセッションを確立する。
  // ブラウザのトップレベル遷移で往復するためGETで受ける
  .get(
    '/oauth/github/login',
    rateLimiter,
    zodValidator('query', oauthLoginQuerySchema),
    oauthGithubLogin,
  )
  .get(
    '/oauth/github/callback',
    rateLimiter,
    zodValidator('query', oauthCallbackQuerySchema),
    oauthGithubCallback,
  )
  // GitHub連携管理(要認証)。設定画面のトグルが連携状態の取得・連携開始・解除に使う
  .get('/oauth/github/link', authenticator, oauthGithubLink)
  .get('/oauth/github', authenticator, oauthGithubStatus)
  .delete('/oauth/github', authenticator, oauthGithubUnlink)

export default app
