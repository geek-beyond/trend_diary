import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import {
  buildGithubCallbackUrl,
  OAUTH_COOKIE_OPTIONS,
  OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/server/auth/oauth-redirect'

export default async function oauthGithubLink(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient(c.env.DB)
  const useCase = createAuthUseCase(client, rdb)

  const result = await useCase.startGithubLink(buildGithubCallbackUrl(c))
  if (result.isErr()) throw handleError(result.error, logger)

  // 連携は設定画面から始まる操作のため、完了後は設定画面へ戻す
  setCookie(c, OAUTH_FLOW_COOKIE, OAUTH_FLOW.link, OAUTH_COOKIE_OPTIONS)
  setCookie(c, OAUTH_REDIRECT_COOKIE, '/settings', OAUTH_COOKIE_OPTIONS)

  return c.redirect(result.value.url, 302)
}
