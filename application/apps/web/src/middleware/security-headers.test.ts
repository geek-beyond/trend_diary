import { Hono } from 'hono'
import { CONTENT_SECURITY_POLICY, securityHeaders } from './security-headers'

function parseCsp(header: string): Record<string, string[]> {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [directive, ...sources] = part.split(/\s+/)
        return [directive, sources]
      }),
  )
}

async function requestHeaders(): Promise<{
  csp: string
  hsts: string | null
  nonce: string | undefined
}> {
  let nonce: string | undefined
  const app = new Hono()
  app.use(securityHeaders())
  app.get('/', (c) => {
    nonce = c.get('secureHeadersNonce')
    return c.text('ok')
  })
  const res = await app.request('/')
  return {
    csp: res.headers.get('Content-Security-Policy') ?? '',
    hsts: res.headers.get('Strict-Transport-Security'),
    nonce,
  }
}

describe('CONTENT_SECURITY_POLICY', () => {
  describe('正常系', () => {
    it('XSS対策の基本ディレクティブを設定する', () => {
      expect(CONTENT_SECURITY_POLICY.defaultSrc).toEqual(["'self'"])
      expect(CONTENT_SECURITY_POLICY.objectSrc).toEqual(["'none'"])
      expect(CONTENT_SECURITY_POLICY.baseUri).toEqual(["'self'"])
      expect(CONTENT_SECURITY_POLICY.formAction).toEqual(["'self'"])
      // クリックジャッキング防止のため自ドメインへの埋め込みも許可しない
      expect(CONTENT_SECURITY_POLICY.frameAncestors).toEqual(["'none'"])
    })

    it('script-src は nonce と strict-dynamic を使い unsafe-inline / unsafe-eval を含めない', async () => {
      const { csp, nonce } = await requestHeaders()
      const parsed = parseCsp(csp)

      expect(nonce).toBeDefined()
      expect(parsed['script-src']).toContain("'self'")
      expect(parsed['script-src']).toContain(`'nonce-${nonce}'`)
      expect(parsed['script-src']).toContain("'strict-dynamic'")
      expect(parsed['script-src']).toContain('https://challenges.cloudflare.com')
      expect(parsed['script-src']).not.toContain("'unsafe-inline'")
      expect(parsed['script-src']).not.toContain("'unsafe-eval'")
    })

    it('Turnstileのスクリプト読込とiframe描画を許可する', async () => {
      const { csp } = await requestHeaders()
      const parsed = parseCsp(csp)

      expect(parsed['script-src']).toContain('https://challenges.cloudflare.com')
      expect(parsed['frame-src']).toEqual(['https://challenges.cloudflare.com'])
    })
  })
})

describe('securityHeaders', () => {
  describe('正常系', () => {
    it('has-hsts監査を満たす強力なHSTSポリシーを設定する', async () => {
      const { hsts } = await requestHeaders()

      // max-ageは1年(31536000秒)以上であること
      const maxAge = Number(hsts?.match(/max-age=(\d+)/)?.[1])
      expect(maxAge).toBeGreaterThanOrEqual(31536000)
      expect(hsts).toContain('includeSubDomains')
      expect(hsts).toContain('preload')
    })
  })
})
