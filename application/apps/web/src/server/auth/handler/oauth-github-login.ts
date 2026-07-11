import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase, type OAuthLoginQuery } from '@trend-diary/domain/user'
import { setCookie } from 'hono/cookie'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedQueryContext } from '@/middleware/zod-validator'
import {
  buildGithubCallbackUrl,
  OAUTH_REDIRECT_COOKIE,
  OAUTH_REDIRECT_COOKIE_OPTIONS,
  resolveOAuthRedirectTarget,
} from '../oauth-redirect'

export default async function oauthGithubLogin(c: ZodValidatedQueryContext<OAuthLoginQuery>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const { redirect } = c.req.valid('query')

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient(c.env.DB)
  const useCase = createAuthUseCase(client, rdb)

  const result = await useCase.startGithubLogin(buildGithubCallbackUrl(c))
  if (result.isErr()) throw handleError(result.error, logger)

  const redirectTarget = resolveOAuthRedirectTarget(redirect)
  if (redirectTarget) {
    setCookie(c, OAUTH_REDIRECT_COOKIE, redirectTarget, OAUTH_REDIRECT_COOKIE_OPTIONS)
  }

  return c.redirect(result.value.url, 302)
}
