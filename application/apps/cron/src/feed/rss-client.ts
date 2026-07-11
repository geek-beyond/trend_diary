import { fetchWithTimeout } from '@trend-diary/common/http'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { err, type Result } from 'neverthrow'
import Parser from 'rss-parser'

// INFO: 外部RSSのハング時に無限待機しないよう1試行あたりのタイムアウトを設ける
const FETCH_TIMEOUT_MS = 30_000
// INFO: 一時的なネットワークエラーを吸収するためのリトライ回数（初回 + リトライ）
const MAX_FETCH_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1_000
const RETRY_MAX_DELAY_MS = 30_000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 指数バックオフの待機時間(2^attempt × base)を算出し、上限でクランプする。
export function backoffDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS)
}

async function fetchRssFeedOnce<T>(url: string): Promise<Result<T[], Error>> {
  const responseResult = await wrapAsyncCall(() =>
    fetchWithTimeout(url, { timeoutMs: FETCH_TIMEOUT_MS }),
  )
  if (responseResult.isErr()) return err(responseResult.error)

  const response = responseResult.value
  if (!response.ok) {
    return err(new Error(`Failed to fetch rss feed: ${url}, status=${response.status}`))
  }

  const parser = new Parser<{ items: T[] }, T>()
  return wrapAsyncCall(async () => {
    const xml = await response.text()
    const feed = await parser.parseString(xml)
    return feed.items
  })
}

export async function fetchRssFeed<T>(url: string): Promise<Result<T[], Error>> {
  let lastError: Error = new Error(`Failed to fetch rss feed: ${url}`)

  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    const result = await fetchRssFeedOnce<T>(url)
    if (result.isOk()) return result

    lastError = result.error
    // INFO: 最終試行後は待機せず失敗を返す
    if (attempt < MAX_FETCH_ATTEMPTS - 1) {
      await delay(backoffDelayMs(attempt))
    }
  }

  return err(lastError)
}
