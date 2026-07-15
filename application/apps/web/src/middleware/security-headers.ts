import { NONCE, secureHeaders } from 'hono/secure-headers'

type SecureHeadersOptions = NonNullable<Parameters<typeof secureHeaders>[0]>
type ContentSecurityPolicyOptions = NonNullable<SecureHeadersOptions['contentSecurityPolicy']>

// Cloudflare Turnstile（CAPTCHA）はスクリプト読込とウィジェットのiframe描画に外部オリジンを使う
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com'

export const CONTENT_SECURITY_POLICY: ContentSecurityPolicyOptions = {
  defaultSrc: ["'self'"],
  // React Router / next-themes が挿入するインラインscriptを 'unsafe-inline' なしで許可するため nonce を使う
  scriptSrc: ["'self'", NONCE, TURNSTILE_ORIGIN],
  // sonner や Radix 等のUIライブラリが実行時にインラインstyleを差し込むため許可する
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:'],
  fontSrc: ["'self'"],
  connectSrc: ["'self'"],
  frameSrc: [TURNSTILE_ORIGIN],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
}

export function securityHeaders() {
  return secureHeaders({ contentSecurityPolicy: CONTENT_SECURITY_POLICY })
}
