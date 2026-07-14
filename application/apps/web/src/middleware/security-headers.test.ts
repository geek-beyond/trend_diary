import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { buildContentSecurityPolicy } from './security-headers'

// CSPヘッダー文字列からディレクティブ名 -> ソース配列のマップへ変換する
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

async function requestCspHeader(
  isDev: boolean,
): Promise<{ header: string; nonce: string | undefined }> {
  let nonce: string | undefined
  const app = new Hono()
  app.use(secureHeaders({ contentSecurityPolicy: buildContentSecurityPolicy(isDev) }))
  app.get('/', (c) => {
    nonce = c.get('secureHeadersNonce')
    return c.text('ok')
  })
  const res = await app.request('/')
  return { header: res.headers.get('Content-Security-Policy') ?? '', nonce }
}

describe('buildContentSecurityPolicy', () => {
  describe('正常系', () => {
    it('XSS対策の基本ディレクティブを本番・開発の双方で設定する', () => {
      const cases = [buildContentSecurityPolicy(false), buildContentSecurityPolicy(true)]
      cases.forEach((csp) => {
        expect(csp.defaultSrc).toEqual(["'self'"])
        expect(csp.objectSrc).toEqual(["'none'"])
        expect(csp.baseUri).toEqual(["'self'"])
        expect(csp.formAction).toEqual(["'self'"])
        // クリックジャッキング防止のため自ドメインへの埋め込みも許可しない
        expect(csp.frameAncestors).toEqual(["'none'"])
      })
    })

    it('本番の script-src は nonce を使い unsafe-inline / unsafe-eval を含めない', async () => {
      const { header, nonce } = await requestCspHeader(false)
      const csp = parseCsp(header)

      expect(nonce).toBeDefined()
      expect(csp['script-src']).toContain("'self'")
      expect(csp['script-src']).toContain(`'nonce-${nonce}'`)
      expect(csp['script-src']).toContain('https://challenges.cloudflare.com')
      expect(csp['script-src']).not.toContain("'unsafe-inline'")
      expect(csp['script-src']).not.toContain("'unsafe-eval'")
    })

    it('Turnstileのスクリプト読込とiframe描画を許可する', async () => {
      const { header } = await requestCspHeader(false)
      const csp = parseCsp(header)

      expect(csp['script-src']).toContain('https://challenges.cloudflare.com')
      expect(csp['frame-src']).toEqual(['https://challenges.cloudflare.com'])
    })
  })

  describe('準正常系', () => {
    it('開発時は Vite の HMR 用に unsafe-inline / unsafe-eval / WebSocket を許可する', async () => {
      const { header, nonce } = await requestCspHeader(true)
      const csp = parseCsp(header)

      // nonce と unsafe-inline は併用不可（nonce があると unsafe-inline が無視される）ため開発時は nonce を付与しない
      expect(nonce).toBeUndefined()
      expect(csp['script-src']).toContain("'unsafe-inline'")
      expect(csp['script-src']).toContain("'unsafe-eval'")
      expect(csp['connect-src']).toContain('ws:')
    })
  })
})
