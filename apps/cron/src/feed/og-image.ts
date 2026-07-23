import { fetchWithTimeout } from '@trend-diary/runtime/http'
import { wrapAsyncCall } from '@trend-diary/std/result'

// 画像は装飾用途で記事の有効性に影響しないため、取得・抽出のどの失敗も null に縮退させ取込全体を止めない。
// リトライもしない（次回 cron で新規記事として扱われることはなく、失敗はプレースホルダー表示に落ちるだけのため）
const FETCH_TIMEOUT_MS = 10_000

export async function fetchOgImageUrl(articleUrl: string): Promise<string | null> {
  const responseResult = await wrapAsyncCall(() =>
    fetchWithTimeout(articleUrl, { timeoutMs: FETCH_TIMEOUT_MS }),
  )
  if (responseResult.isErr()) return null

  const response = responseResult.value
  if (!response.ok) return null

  let content: string | null = null
  const rewriter = new HTMLRewriter().on('meta[property="og:image"]', {
    element(element) {
      // 複数定義された場合は仕様上代表とされる最初の og:image を採用する
      content ??= element.getAttribute('content')
    },
  })
  // HTMLRewriter はストリームを消費した分しか走査しないため、メタタグ抽出には全量の読み捨てが必要
  const drained = await wrapAsyncCall(() => rewriter.transform(response).arrayBuffer())
  if (drained.isErr()) return null
  if (content === null) return null

  return normalizeOgImageUrl(content, articleUrl)
}

// og:image は絶対 URL が仕様だが相対で書くサイトも実在するため、記事 URL 基準で解決する。
// new URL が URL 妥当性の検証を兼ね、解決できない content は null に落とす
function normalizeOgImageUrl(rawContent: string, articleUrl: string): string | null {
  try {
    return new URL(rawContent, articleUrl).toString()
  } catch {
    return null
  }
}
