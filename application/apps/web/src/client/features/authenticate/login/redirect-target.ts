// 判定用の仮想オリジン。window に依存させずSSR環境でも動作させるための固定値
const REDIRECT_BASE_URL = 'https://safe.internal'

// ログイン後にここへ戻すと再びログインへ迷い込むだけの無限ループめいた遷移になるため除外する
const LOGIN_FLOW_PATHS = ['/login', '/signup']

// 外部ドメインへの誤誘導（オープンリダイレクト）を避ける。制御文字の除去や
// バックスラッシュの正規化など、文字列比較では取りこぼすブラウザのURL解釈を
// WHATWG URLパーサーに委ね、解決後のoriginが変わっていないことで内部パスと判定する
export function resolveLoginRedirectTarget(rawValue: string | null): string | undefined {
  if (!rawValue || !rawValue.startsWith('/')) return undefined

  try {
    const url = new URL(rawValue, REDIRECT_BASE_URL)
    if (url.origin !== REDIRECT_BASE_URL) return undefined
    if (LOGIN_FLOW_PATHS.includes(url.pathname)) return undefined

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return undefined
  }
}
