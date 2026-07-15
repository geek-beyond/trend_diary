import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { CONTENT_SECURITY_POLICY } from './security-headers'

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

async function requestCspHeader(): Promise<{ header: string; nonce: string | undefined }> {
  let nonce: string | undefined
  const app = new Hono()
  app.use(secureHeaders({ contentSecurityPolicy: CONTENT_SECURITY_POLICY }))
  app.get('/', (c) => {
    nonce = c.get('secureHeadersNonce')
    return c.text('ok')
  })
  const res = await app.request('/')
  return { header: res.headers.get('Content-Security-Policy') ?? '', nonce }
}

describe('CONTENT_SECURITY_POLICY', () => {
  it('XSS対策の基本ディレクティブを設定する', () => {
    expect(CONTENT_SECURITY_POLICY.defaultSrc).toEqual(["'self'"])
    expect(CONTENT_SECURITY_POLICY.objectSrc).toEqual(["'none'"])
    expect(CONTENT_SECURITY_POLICY.baseUri).toEqual(["'self'"])
    expect(CONTENT_SECURITY_POLICY.formAction).toEqual(["'self'"])
    // クリックジャッキング防止のため自ドメインへの埋め込みも許可しない
    expect(CONTENT_SECURITY_POLICY.frameAncestors).toEqual(["'none'"])
  })

  it('script-src は nonce を使い unsafe-inline / unsafe-eval を含めない', async () => {
    const { header, nonce } = await requestCspHeader()
    const csp = parseCsp(header)

    expect(nonce).toBeDefined()
    expect(csp['script-src']).toContain("'self'")
    expect(csp['script-src']).toContain(`'nonce-${nonce}'`)
    expect(csp['script-src']).toContain('https://challenges.cloudflare.com')
    expect(csp['script-src']).not.toContain("'unsafe-inline'")
    expect(csp['script-src']).not.toContain("'unsafe-eval'")
  })

  it('Turnstileのスクリプト読込とiframe描画を許可する', async () => {
    const { header } = await requestCspHeader()
    const csp = parseCsp(header)

    expect(csp['script-src']).toContain('https://challenges.cloudflare.com')
    expect(csp['frame-src']).toEqual(['https://challenges.cloudflare.com'])
  })
})
