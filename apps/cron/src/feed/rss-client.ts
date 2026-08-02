import { fetchWithTimeout } from '@trend-diary/runtime/http'
import { wrapAsyncCall } from '@trend-diary/std/result'
import { err, type Result } from 'neverthrow'
import Parser from 'rss-parser'

// INFO: 外部RSSのハング時に無限待機しないようタイムアウトを設ける
const FETCH_TIMEOUT_MS = 30_000
const TOO_MANY_REQUESTS = 429

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

  // レート制限は配信元の障害と違い受け手の対応が不要なため、通知で区別できるよう判定を公開する。
  get isRateLimited(): boolean {
    return this.diagnostics.status === TOO_MANY_REQUESTS
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

// 取得失敗は毎時の定期実行が再試行を兼ねるため、run 内でのリトライは行わない。
export async function fetchRssFeed<T>(url: string): Promise<Result<T[], Error>> {
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
