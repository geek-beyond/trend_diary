import { ClientError, handleError } from '@trend-diary/common/errors'
import { resolveLoginRedirectTarget } from '@trend-diary/common/sanitization'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase, type OAuthCallbackQuery } from '@trend-diary/domain/user'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { deleteCookie, getCookie } from 'hono/cookie'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedQueryContext } from '@/middleware/zod-validator'
import {
  OAUTH_COOKIE_OPTIONS,
  OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/server/auth/oauth-redirect'

export default async function oauthGithubCallback(c: ZodValidatedQueryContext<OAuthCallbackQuery>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const { code, error, error_description } = c.req.valid('query')

  const flow = getCookie(c, OAUTH_FLOW_COOKIE)
  const redirectTarget =
    resolveLoginRedirectTarget(getCookie(c, OAUTH_REDIRECT_COOKIE)) ?? '/trends'
  deleteCookie(c, OAUTH_FLOW_COOKIE, { path: OAUTH_COOKIE_OPTIONS.path })
  deleteCookie(c, OAUTH_REDIRECT_COOKIE, { path: OAUTH_COOKIE_OPTIONS.path })

  // 失敗時はJSONを返してもユーザーは操作できないため、エラー種別を添えて画面へ戻す。
  // 連携フローはログイン済みのまま設定画面へ、ログインフローはログイン画面へ
  const errorRedirect =
    flow === OAUTH_FLOW.link ? '/settings?oauthError=github' : '/login?oauthError=github'

  // ユーザーによる認可拒否やプロバイダ側の失敗。詳細はログにだけ残す
  if (!code) {
    logger.warn('github oauth callback without code', {
      oauthError: error,
      oauthErrorDescription: error_description,
    })
    return c.redirect(errorRedirect, 302)
  }

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient(c.env.DB)
  const useCase = createAuthUseCase(client, rdb)

  const notifier = new DiscordWebhookClient(c.env.DISCORD_WEBHOOK_URL, logger)
  const result = await useCase.loginWithGithubCallback(code, notifier)
  if (result.isErr()) {
    // コードの期限切れ等はユーザーの再試行で解消するため、エラー画面にせず元の画面へ戻す
    if (result.error instanceof ClientError) {
      logger.warn('github oauth login failed', { message: result.error.message })
      return c.redirect(errorRedirect, 302)
    }

    throw handleError(result.error, logger)
  }

  const { activeUser } = result.value
  logger.info('github oauth login success', { activeUserId: activeUser.activeUserId })

  return c.redirect(redirectTarget, 302)
}
