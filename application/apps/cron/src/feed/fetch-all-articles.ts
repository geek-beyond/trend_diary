import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import type Logger from '@trend-diary/logger'
import type { DiscordWebhookClient } from '@trend-diary/notification'
import { wrapAsyncCall } from '@trend-diary/std/result'
import { err, type Result } from 'neverthrow'
import type { CronEnv } from '../env'
import { runScheduledFetch } from './fetch-articles'
import { RssFetchError, type RssFetchDiagnostics } from './rss-client'

export interface FetchAllArticlesParams {
  env: CronEnv
  logger: Logger
  discord: DiscordWebhookClient
  cron: string
  scheduledTime: number
}

interface MediaFetchOutcome {
  media: ArticleMedia
  result: Result<number, Error>
  durationMs: number
}

// 診断情報を通知本文へ簡潔に併記し、Discord からでも 429 等の一次切り分けを可能にする。
function formatDiagnostics(diagnostics: RssFetchDiagnostics): string {
  const lines: string[] = []

  const headerEntries = Object.entries(diagnostics.headers)
  if (headerEntries.length > 0) {
    lines.push(`headers: ${headerEntries.map(([name, value]) => `${name}=${value}`).join(', ')}`)
  }
  if (diagnostics.bodySnippet) {
    lines.push(`body: ${diagnostics.bodySnippet}`)
  }

  return lines.length > 0 ? `\n${lines.join('\n')}` : ''
}

export async function fetchAllArticles({
  env,
  logger,
  discord,
  cron,
  scheduledTime,
}: FetchAllArticlesParams): Promise<void> {
  const jobStartedAt = Date.now()

  let successCount = 0
  let failedCount = 0
  let insertedTotal = 0

  logger.info({
    msg: 'cron job started',
    scheduledTime,
    mediaCount: ARTICLE_MEDIA.length,
  })

  // フィード取得はI/O待ちが支配的なため、メディア単位で並列実行して壁時計時間を短縮する
  const outcomes = await Promise.all(
    ARTICLE_MEDIA.map(async (media): Promise<MediaFetchOutcome> => {
      const mediaStartedAt = Date.now()
      logger.info({ msg: 'cron media fetch started', media })
      // runScheduledFetch はResultを返し原則rejectしないが、想定外の例外も失敗として扱う
      const fetched = await wrapAsyncCall(() => runScheduledFetch(media, env, logger))
      const result = fetched.isErr() ? err(fetched.error) : fetched.value
      return { media, result, durationMs: Date.now() - mediaStartedAt }
    }),
  )

  for (const { media, result, durationMs } of outcomes) {
    if (result.isErr()) {
      failedCount += 1
      const error = result.error
      // 429 等は status だけでは原因を追えないため、配信元レスポンスの診断情報を併せて残す
      const diagnostics = error instanceof RssFetchError ? error.diagnostics : undefined
      logger.error(
        { msg: 'cron media fetch failed', media, durationMs, ...(diagnostics && { diagnostics }) },
        error,
      )
      const detail = diagnostics ? formatDiagnostics(diagnostics) : ''
      await discord.sendMessage(
        `[trend-diary cron] fetch failed\ncron: ${cron}\nmedia: ${media}\nerror: ${error.message}${detail}`,
      )
      continue
    }

    const insertedCount = result.value
    successCount += 1
    insertedTotal += insertedCount
    logger.info({ msg: 'cron media fetch completed', media, insertedCount, durationMs })
  }

  logger.info({
    msg: 'cron job completed',
    successCount,
    failedCount,
    insertedTotal,
    durationMs: Date.now() - jobStartedAt,
  })

  if (failedCount > 0) {
    throw new Error(`cron job failed: ${failedCount}/${ARTICLE_MEDIA.length} media failed`)
  }
}
