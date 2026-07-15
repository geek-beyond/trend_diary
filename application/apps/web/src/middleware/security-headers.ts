import { NONCE, secureHeaders } from 'hono/secure-headers'

type SecureHeadersOptions = NonNullable<Parameters<typeof secureHeaders>[0]>
type ContentSecurityPolicyOptions = NonNullable<SecureHeadersOptions['contentSecurityPolicy']>

// Cloudflare Turnstile（CAPTCHA）はスクリプト読込とウィジェットのiframe描画に外部オリジンを使う
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com'

// max-ageを1年以上・includeSubDomains・preload付きにすることで PageSpeed(Lighthouse)の has-hsts 監査を満たす。
// Honoの既定値(180日)は同監査の要求(1年)に届かないため明示的に強化する
const STRICT_TRANSPORT_SECURITY = 'max-age=63072000; includeSubDomains; preload'

export const CONTENT_SECURITY_POLICY: ContentSecurityPolicyOptions = {
  defaultSrc: ["'self'"],
  // React Router / next-themes が挿入するインラインscriptを 'unsafe-inline' なしで許可するため nonce を使う。
  // 'strict-dynamic' により、nonce付きスクリプトが動的生成した子スクリプト(Turnstile等)へ信頼を伝播させ、
  // ホスト許可リストのバイパス耐性を高める（has-csp-xss 監査の推奨事項）
  scriptSrc: ["'self'", NONCE, "'strict-dynamic'", TURNSTILE_ORIGIN],
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
  return secureHeaders({
    contentSecurityPolicy: CONTENT_SECURITY_POLICY,
    strictTransportSecurity: STRICT_TRANSPORT_SECURITY,
  })
}
