import { handleError } from '@trend-diary/common/errors'
import { resolveLoginRedirectTarget } from '@trend-diary/common/sanitization'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase, type OAuthLoginQuery } from '@trend-diary/domain/user'
import { deleteCookie, setCookie } from 'hono/cookie'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedQueryContext } from '@/middleware/zod-validator'
import {
  buildGithubCallbackUrl,
  OAUTH_COOKIE_OPTIONS,
  OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/server/oauth/redirect'

export default async function githubLogin(c: ZodValidatedQueryContext<OAuthLoginQuery>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const { redirect } = c.req.valid('query')

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient(c.env.DB)
  const useCase = createAuthUseCase(client, rdb)

  const result = await useCase.startGithubLogin(buildGithubCallbackUrl(c))
  if (result.isErr()) throw handleError(result.error, logger)

  setCookie(c, OAUTH_FLOW_COOKIE, OAUTH_FLOW.login, OAUTH_COOKIE_OPTIONS)

  const redirectTarget = resolveLoginRedirectTarget(redirect)
  if (redirectTarget) {
    setCookie(c, OAUTH_REDIRECT_COOKIE, redirectTarget, OAUTH_COOKIE_OPTIONS)
  } else {
    // 直前の未完了フローの戻り先が残っていると誤った画面へ戻すため、必ずクリアする
    deleteCookie(c, OAUTH_REDIRECT_COOKIE, { path: OAUTH_COOKIE_OPTIONS.path })
  }

  return c.redirect(result.value.url, 302)
}
