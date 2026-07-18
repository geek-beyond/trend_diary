import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
import {
  buildGithubCallbackUrl,
  OAUTH_COOKIE_OPTIONS,
  OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/server/oauth/redirect'

export default async function githubLink(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const oauthClient = new OAuthClient(authClientConfig(c))
  const result = await oauthClient.startLink('github', buildGithubCallbackUrl(c))
  if (result.isErr()) throw handleError(toAuthError(result.error), logger)

  // 連携は設定画面から始まる操作のため、完了後は設定画面へ戻す
  setCookie(c, OAUTH_FLOW_COOKIE, OAUTH_FLOW.link, OAUTH_COOKIE_OPTIONS)
  setCookie(c, OAUTH_REDIRECT_COOKIE, '/settings', OAUTH_COOKIE_OPTIONS)

  return c.redirect(result.value.url, 302)
}
