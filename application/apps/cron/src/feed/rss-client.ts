import { fetchWithTimeout } from '@trend-diary/common/http'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { err, ok, type Result } from 'neverthrow'
import Parser from 'rss-parser'

// INFO: 外部RSSのハング時に無限待機しないよう1試行あたりのタイムアウトを設ける
const FETCH_TIMEOUT_MS = 30_000
// INFO: 一時的なネットワークエラーを吸収するためのリトライ回数（初回 + リトライ）
const MAX_FETCH_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1_000
const RETRY_MAX_DELAY_MS = 30_000
const TOO_MANY_REQUESTS = 429

// INFO: UA を持たないリクエストは配信元に bot と見なされ 429/403 を返されやすいため、
// 連絡先を含む識別可能な UA を付与してレート制限を避ける
const RSS_USER_AGENT = 'trend-diary-cron/1.0 (+https://github.com/geek-beyond/trend_diary)'

// リトライ間隔の決定に必要な、失敗の内訳を表す。
interface FetchFailure {
  error: Error
  // 429 応答が Retry-After で指定した待機時間（ミリ秒）。指定が無ければ undefined。
  retryAfterMs?: number
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 指数バックオフの待機時間(2^attempt × base)を算出し、上限でクランプする。
export function backoffDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS)
}

// Retry-After は「delta-seconds（非負整数）」か「HTTP-date」の2形式を取り得るため、両方を待機ミリ秒へ正規化する。
export function parseRetryAfterMs(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const trimmed = value.trim()

  // delta-seconds は非負整数のみが有効
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1_000
  // 負値・小数など数値だが不正な指定は、Date.parse が緩く解釈するのを避けるため無視する
  if (!Number.isNaN(Number(trimmed))) return undefined

  const dateMs = Date.parse(trimmed)
  if (Number.isNaN(dateMs)) return undefined
  // 既に過去日付なら待機不要とみなし0へ丸める
  return Math.max(0, dateMs - Date.now())
}

// サーバ指定の Retry-After があれば優先し、無ければ指数バックオフにフォールバックする。
// いずれも実行時間の暴発を防ぐため上限でクランプする。
export function retryDelayMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) return Math.min(retryAfterMs, RETRY_MAX_DELAY_MS)
  return backoffDelayMs(attempt)
}

async function fetchRssFeedOnce<T>(url: string): Promise<Result<T[], FetchFailure>> {
  const responseResult = await wrapAsyncCall(() =>
    fetchWithTimeout(url, {
      timeoutMs: FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': RSS_USER_AGENT },
    }),
  )
  if (responseResult.isErr()) return err({ error: responseResult.error })

  const response = responseResult.value
  if (!response.ok) {
    const retryAfterMs =
      response.status === TOO_MANY_REQUESTS
        ? parseRetryAfterMs(response.headers?.get('retry-after'))
        : undefined
    return err({
      error: new Error(`Failed to fetch rss feed: ${url}, status=${response.status}`),
      retryAfterMs,
    })
  }

  const parser = new Parser<{ items: T[] }, T>()
  const parsed = await wrapAsyncCall(async () => {
    const xml = await response.text()
    const feed = await parser.parseString(xml)
    return feed.items
  })
  return parsed.mapErr((error) => ({ error }))
}

export async function fetchRssFeed<T>(url: string): Promise<Result<T[], Error>> {
  let lastError: Error = new Error(`Failed to fetch rss feed: ${url}`)

  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    const result = await fetchRssFeedOnce<T>(url)
    if (result.isOk()) return ok(result.value)

    lastError = result.error.error
    // INFO: 最終試行後は待機せず失敗を返す
    if (attempt < MAX_FETCH_ATTEMPTS - 1) {
      await delay(retryDelayMs(attempt, result.error.retryAfterMs))
    }
  }

  return err(lastError)
}
