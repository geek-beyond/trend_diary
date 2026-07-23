import { fetchWithTimeout } from '@trend-diary/runtime/http'
import { wrapAsyncCall } from '@trend-diary/std/result'
import { err, type Result } from 'neverthrow'
import Parser from 'rss-parser'

// INFO: 外部RSSのハング時に無限待機しないよう1試行あたりのタイムアウトを設ける
const FETCH_TIMEOUT_MS = 30_000
// INFO: 一時的なネットワークエラーを吸収するためのリトライ回数（初回 + リトライ）
const MAX_FETCH_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1_000
const RETRY_MAX_DELAY_MS = 30_000

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

async function collectDiagnostics(response: Response): Promise<RssFetchDiagnostics> {
  const headers: Record<string, string> = {}
  for (const name of DIAGNOSTIC_HEADER_NAMES) {
    const value = response.headers.get(name)
    if (value !== null && value !== undefined) headers[name] = value
  }

  const bodySnippet = await readBodySnippet(response)
  return { status: response.status, headers, ...(bodySnippet ? { bodySnippet } : {}) }
}

async function readBodySnippet(response: Response): Promise<string | undefined> {
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

async function fetchRssFeedOnce<T>(url: string): Promise<Result<T[], Error>> {
  const responseResult = await wrapAsyncCall(() =>
    fetchWithTimeout(url, { timeoutMs: FETCH_TIMEOUT_MS }),
  )
  if (responseResult.isErr()) return err(responseResult.error)

  const response = responseResult.value
  if (!response.ok) {
    const diagnostics = await collectDiagnostics(response)
    return err(new RssFetchError(url, diagnostics))
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
