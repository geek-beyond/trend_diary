import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import { ClientError } from '@trend-diary/common/errors'
import { resolveLoginRedirectTarget } from '@trend-diary/common/sanitization'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase, type OAuthCallbackQuery } from '@trend-diary/domain/account'
import { deleteCookie, getCookie } from 'hono/cookie'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedQueryContext } from '@/middleware/zod-validator'
import { handleError } from '@/server/error/handle-error'
import {
  OAUTH_COOKIE_OPTIONS,
  OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/server/oauth/redirect'

export default async function githubCallback(c: ZodValidatedQueryContext<OAuthCallbackQuery>) {
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

  const oauthClient = new OAuthClient(authClientConfig(c))
  const exchangeResult = await oauthClient.exchangeCode(code)
  if (exchangeResult.isErr()) {
    // コードの期限切れ・使い回し等はユーザーの再試行で解消するため、エラー画面にせず元の画面へ戻す
    logger.warn('github oauth code exchange failed', { message: exchangeResult.error.message })
    return c.redirect(errorRedirect, 302)
  }

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const result = await accountUseCase.resolveActiveUser(exchangeResult.value.id)
  if (result.isErr()) {
    // GitHubログインは既存ユーザーの認証手段としてのみ許可する。連携済みアプリユーザーが無ければ
    // 新規登録させず、再試行で解消しうる認証失敗(404)として元の画面へ戻す
    if (result.error instanceof ClientError) {
      logger.warn('github oauth login failed', { message: result.error.message })
      return c.redirect(errorRedirect, 302)
    }

    throw handleError(result.error, logger)
  }

  logger.info('github oauth login success', { activeUserId: result.value.activeUserId })

  return c.redirect(redirectTarget, 302)
}
