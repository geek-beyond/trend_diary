import { oauthCallbackQuerySchema, oauthLoginQuerySchema } from '@trend-diary/domain/account'
import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import zodValidator from '@/middleware/zod-validator'
import githubCallback from './handler/github-callback'
import githubLink from './handler/github-link'
import githubLogin from './handler/github-login'
import githubStatus from './handler/github-status'
import githubUnlink from './handler/github-unlink'

const app = new Hono<Env>()
  // GitHub OAuth(未認証で可)。認可はSupabase経由でGitHubへ委譲し、callbackでセッションを確立する。
  // ブラウザのトップレベル遷移で往復するためGETで受ける
  .get('/github/login', rateLimiter, zodValidator('query', oauthLoginQuerySchema), githubLogin)
  .get(
    '/github/callback',
    rateLimiter,
    zodValidator('query', oauthCallbackQuerySchema),
    githubCallback,
  )
  .get('/github/link', authenticator, githubLink)
  .get('/github', authenticator, githubStatus)
  .delete('/github', authenticator, githubUnlink)

export default app
