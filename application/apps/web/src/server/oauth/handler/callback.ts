import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { ActiveUserNotFoundError, createAccountUseCase } from '@trend-diary/domain/account'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { resolveLoginRedirectTarget } from '@trend-diary/std/sanitization'
import { deleteCookie, getCookie } from 'hono/cookie'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import throwHttpError from '@/server/error/account-error'
import {
  OAUTH_COOKIE_OPTIONS,
  OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/server/oauth/redirect'
import type {
  oauthCallbackQueryValidator,
  oauthProviderParamValidator,
} from '@/server/oauth/schema'

export default async function oauthCallback(
  c: ZodValidatedContext<[typeof oauthProviderParamValidator, typeof oauthCallbackQueryValidator]>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const { provider } = c.req.valid('param')
  const { code, error, error_description } = c.req.valid('query')

  const flow = getCookie(c, OAUTH_FLOW_COOKIE)
  const redirectTarget =
    resolveLoginRedirectTarget(getCookie(c, OAUTH_REDIRECT_COOKIE)) ?? '/trends'
  deleteCookie(c, OAUTH_FLOW_COOKIE, { path: OAUTH_COOKIE_OPTIONS.path })
  deleteCookie(c, OAUTH_REDIRECT_COOKIE, { path: OAUTH_COOKIE_OPTIONS.path })

  // 失敗時はJSONを返してもユーザーは操作できないため、エラー種別を添えて画面へ戻す。
  // 連携フローはログイン済みのまま設定画面へ、ログインフローはログイン画面へ
  const errorReturnPath = flow === OAUTH_FLOW.link ? '/settings' : '/login'
  const errorRedirect = `${errorReturnPath}?oauthError=${provider}`

  // ユーザーによる認可拒否やプロバイダ側の失敗。詳細はログにだけ残す
  if (!code) {
    logger.warn('oauth callback without code', {
      provider,
      oauthError: error,
      oauthErrorDescription: error_description,
    })
    return c.redirect(errorRedirect, 302)
  }

  const oauthClient = new OAuthClient(authClientConfig(c))
  const exchangeResult = await oauthClient.exchangeCode(code)
  if (exchangeResult.isErr()) {
    // コードの期限切れ・使い回し等はユーザーの再試行で解消するため、エラー画面にせず元の画面へ戻す
    logger.warn('oauth code exchange failed', {
      provider,
      message: exchangeResult.error.message,
    })
    return c.redirect(errorRedirect, 302)
  }

  const { id: authenticationId, email } = exchangeResult.value

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)

  // 既存ユーザーは認証IDだけで特定できるため、メール未取得でもログインを許可する
  const resolved = await accountUseCase.resolveActiveUser(authenticationId)
  if (resolved.isOk()) {
    logger.info('oauth login success', { provider, activeUserId: resolved.value.activeUserId })
    return c.redirect(redirectTarget, 302)
  }
  // 未連携(ActiveUserNotFoundError)は初回ログインとして新規登録へ進む。それ以外はサーバ起因のため送出する
  if (!(resolved.error instanceof ActiveUserNotFoundError)) {
    throw resolved.error
  }

  // 未連携の初回ログインは新規登録として扱う。メール未取得では登録できないため認証失敗として戻す
  if (!email) {
    logger.warn('oauth registration failed: email is required', { provider, authenticationId })
    return c.redirect(errorRedirect, 302)
  }

  const notifier = new DiscordWebhookClient(c.env.DISCORD_WEBHOOK_URL, logger)
  const registered = await accountUseCase.registerActiveUser(email, authenticationId, notifier)
  if (registered.isErr()) {
    throwHttpError(registered.error)
  }

  logger.info('oauth signup success', { provider, activeUserId: registered.value.activeUserId })

  return c.redirect(redirectTarget, 302)
}
