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

// 429 等の失敗要因を後から切り分けられるよう、配信元レスポンスから残す診断情報。
export interface RssFetchDiagnostics {
  status: number
  headers: Record<string, string>
  bodySnippet?: string
}

// レート制限の切り分けに有用なヘッダ（待機指示・CDN の緩和情報・応答時刻など）に絞って残す。
const DIAGNOSTIC_HEADER_NAMES = [
  'retry-after',
  'date',
  'server',
  'cf-ray',
  'cf-mitigated',
  'cf-cache-status',
] as const
// 本文全体はチャレンジページ等で肥大し得るため、原因把握に足る先頭のみ残す。
const BODY_SNIPPET_MAX_LENGTH = 500

// status だけでは 429 の原因を追えないため、レスポンスの診断情報を保持したエラーで通知・ログへ橋渡しする。
export class RssFetchError extends Error {
  readonly diagnostics: RssFetchDiagnostics

  constructor(url: string, diagnostics: RssFetchDiagnostics) {
    super(`Failed to fetch rss feed: ${url}, status=${diagnostics.status}`)
    this.name = 'RssFetchError'
    this.diagnostics = diagnostics
  }
}

// リトライ間隔の決定に必要な、失敗の内訳を表す。
interface FetchFailure {
  error: Error
  // 429 応答が Retry-After で指定した待機時間（ミリ秒）。指定が無ければ undefined。
  retryAfterMs?: number
}

async function collectDiagnostics(response: Response): Promise<RssFetchDiagnostics> {
  const headers: Record<string, string> = {}
  for (const name of DIAGNOSTIC_HEADER_NAMES) {
    const value = response.headers?.get(name)
    if (value !== null && value !== undefined) headers[name] = value
  }

  const bodySnippet = await readBodySnippet(response)
  return { status: response.status, headers, ...(bodySnippet ? { bodySnippet } : {}) }
}

async function readBodySnippet(response: Response): Promise<string | undefined> {
  if (typeof response.text !== 'function') return undefined

  // 本文取得自体が失敗しても診断材料を欠くだけに留め、失敗通知そのものは継続させる
  const result = await wrapAsyncCall(() => response.text())
  if (result.isErr()) return undefined

  const text = result.value.trim()
  if (text === '') return undefined
  return text.length > BODY_SNIPPET_MAX_LENGTH ? `${text.slice(0, BODY_SNIPPET_MAX_LENGTH)}…` : text
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 指数バックオフの待機時間(2^attempt × base)を算出し、上限でクランプする。
export function backoffDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS)
}

// Retry-After は「delta-seconds（非負整数）」か「HTTP-date」の2形式を取り得るため、両方を待機ミリ秒へ正規化する。
// HTTP-date は差分計算に基準時刻を要するが、クライアントとサーバの時刻ズレ（clock drift）を避けるため、
// 呼び出し側がレスポンスの Date ヘッダを refDateStr として渡せるようにする。無い/不正なら Date.now() を使う。
export function parseRetryAfterMs(
  value: string | null | undefined,
  refDateStr?: string | null,
): number | undefined {
  if (!value) return undefined
  const trimmed = value.trim()

  // delta-seconds は非負整数のみが有効
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1_000
  // 負値・小数など数値だが不正な指定は、Date.parse が緩く解釈するのを避けるため無視する
  if (!Number.isNaN(Number(trimmed))) return undefined

  const dateMs = Date.parse(trimmed)
  if (Number.isNaN(dateMs)) return undefined

  const refMs = refDateStr ? Date.parse(refDateStr) : Number.NaN
  const nowMs = Number.isNaN(refMs) ? Date.now() : refMs
  // 既に過去日付なら待機不要とみなし0へ丸める
  return Math.max(0, dateMs - nowMs)
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
    const diagnostics = await collectDiagnostics(response)
    const retryAfterMs =
      response.status === TOO_MANY_REQUESTS
        ? parseRetryAfterMs(diagnostics.headers['retry-after'], diagnostics.headers['date'])
        : undefined
    return err({ error: new RssFetchError(url, diagnostics), retryAfterMs })
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
