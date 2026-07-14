import { NONCE, secureHeaders } from 'hono/secure-headers'

type SecureHeadersOptions = NonNullable<Parameters<typeof secureHeaders>[0]>
type ContentSecurityPolicyOptions = NonNullable<SecureHeadersOptions['contentSecurityPolicy']>

// Cloudflare Turnstile（CAPTCHA）はスクリプト読込とウィジェットのiframe描画に外部オリジンを使う
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com'

/**
 * XSSを防ぐためのContent-Security-Policyを構築する。
 * React Router / next-themes が挿入するインラインscriptは nonce で許可し、'unsafe-inline' を避ける。
 * Viteのdev配信はHMRのインラインscript・eval・WebSocketに依存するため、開発時のみ該当ディレクティブを緩める。
 */
export function buildContentSecurityPolicy(isDev: boolean): ContentSecurityPolicyOptions {
  return {
    defaultSrc: ["'self'"],
    scriptSrc: isDev
      ? ["'self'", TURNSTILE_ORIGIN, "'unsafe-inline'", "'unsafe-eval'"]
      : ["'self'", NONCE, TURNSTILE_ORIGIN],
    // sonner や Radix 等のUIライブラリが実行時にインラインstyleを差し込むため許可する
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'"],
    connectSrc: isDev ? ["'self'", 'ws:'] : ["'self'"],
    frameSrc: [TURNSTILE_ORIGIN],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  }
}

export function securityHeaders() {
  return secureHeaders({
    contentSecurityPolicy: buildContentSecurityPolicy(import.meta.env.DEV),
  })
}
