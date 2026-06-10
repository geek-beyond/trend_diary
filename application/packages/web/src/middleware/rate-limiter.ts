import Logger from '@trend-diary/common/logger'
import { DiscordNotifier } from '@trend-diary/notification'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { Env } from '../env'
import CONTEXT_KEY from './context'

// IP単位でブルートフォース・大量試行を抑止するため、認証系エンドポイントに適用する
const rateLimiter = createMiddleware<Env>(async (c, next) => {
  const limiter = c.env.AUTH_RATE_LIMITER

  // 本番では常にバインディングが設定されるため、未設定時（ローカル開発等）は制限をスキップする
  if (!limiter) {
    return next()
  }

  // パスごとに別カウンタとし、login/signupを独立して制限する
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const key = `${c.req.path}:${ip}`

  try {
    const { success } = await limiter.limit({ key })
    if (!success) {
      throw new HTTPException(429, { message: 'too many requests' })
    }
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }

    // request-logger未確立でもフェイルオープンを記録できるようフォールバックを用意する
    const logger = c.get(CONTEXT_KEY.APP_LOG) ?? new Logger(c.env.LOG_LEVEL || 'info')

    // Rate Limiting API自体の障害で認証を止めないよう、フェイルオープンする。
    // ただしブルートフォースが無制限に通る危険な状態のため、warnではなくerrorで記録しアラート検知できるようにする
    logger.error(
      {
        msg: 'rate limiter unavailable, failing open',
        event: 'rate_limiter_fail_open',
        path: c.req.path,
      },
      error instanceof Error ? error : new Error(String(error)),
    )

    // フェイルオープン状態の継続に気づけるよう、ログに加えてDiscordへアラートする
    const notifier = new DiscordNotifier(c.env.DISCORD_WEBHOOK_URL, logger)
    const alert = notifier.alert('⚠️ Rate Limiter Failing Open', [
      {
        name: 'Detail',
        value: [
          `Path: ${c.req.path}`,
          'State: rate limiting bypassed (fail-open)',
          `Reason: ${error instanceof Error ? error.message : String(error)}`,
        ].join('\n'),
        inline: false,
      },
    ])

    // 通知の遅延・タイムアウトでユーザーのリクエストをブロックしないよう、可能ならバックグラウンドで送る。
    // executionCtxを持たない環境（テスト等）では決定性を保つため待機する（Honoのgetterは未設定時に例外を投げる）
    try {
      c.executionCtx.waitUntil(alert)
    } catch {
      await alert
    }
  }

  return next()
})

export default rateLimiter
