import { Hono } from 'hono'
import type { Mock } from 'vitest'
import type { Env } from '@/env'
import TEST_ENV from '@/test/env'
import articleCache, { ARTICLE_CACHE_TTL_SECONDS } from './article-cache'

const ARTICLES_URL = 'https://example.com/api/articles?page=1'

// Cache API を模した最小のインメモリ実装を caches.default としてスタブする
function stubEdgeCache(): { match: Mock; put: Mock; store: Map<string, Response> } {
  const store = new Map<string, Response>()
  const match = vi.fn(async (request: Request) => {
    const cached = store.get(request.url)
    return cached ? cached.clone() : undefined
  })
  const put = vi.fn(async (request: Request, response: Response) => {
    store.set(request.url, response)
  })
  vi.stubGlobal('caches', { default: { match, put } })
  return { match, put, store }
}

interface CallOptions {
  method?: string
  cookie?: string
  disabled?: boolean
  handlerStatus?: number
}

// articleCache を通した実リクエストを送り、ダウンストリーム handler の呼び出し有無で素通し(next 実行)を観測する
async function callArticles(
  options: CallOptions = {},
): Promise<{ handler: Mock; waitUntil: Mock; res: Response }> {
  const { method = 'GET', cookie, disabled = false, handlerStatus = 200 } = options
  const handler: Mock = vi.fn(
    () =>
      new Response(JSON.stringify({ data: [] }), {
        status: handlerStatus,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  const app = new Hono<Env>().use('/api/articles', articleCache).get('/api/articles', handler)

  const waitUntil = vi.fn()
  const env: Env['Bindings'] = {
    ...TEST_ENV,
    EDGE_CACHE_DISABLED: disabled ? 'true' : undefined,
  }
  const res = await app.request(
    ARTICLES_URL,
    { method, headers: cookie ? { Cookie: cookie } : undefined },
    env,
    { waitUntil, passThroughOnException: () => {}, props: {} },
  )
  return { handler, waitUntil, res }
}

describe('articleCache ミドルウェア', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('正常系', () => {
    it('未ログインの GET はキャッシュミス時に handler を実行し、200 応答を保存すること', async () => {
      const { put, store } = stubEdgeCache()
      const { handler, waitUntil, res } = await callArticles()

      expect(handler).toHaveBeenCalledOnce()
      expect(waitUntil).toHaveBeenCalledOnce()
      expect(put).toHaveBeenCalledOnce()
      expect(store.size).toBe(1)
      expect(res.status).toBe(200)
    })

    it('保存する応答に Cache-Control(s-maxage) を付与すること', async () => {
      const { store } = stubEdgeCache()
      await callArticles()

      const stored = store.get(ARTICLES_URL)
      expect(stored?.headers.get('Cache-Control')).toBe(
        `public, s-maxage=${ARTICLE_CACHE_TTL_SECONDS}`,
      )
    })

    it('キャッシュヒット時は handler を実行せずキャッシュ応答を返すこと', async () => {
      const { store, match } = stubEdgeCache()
      store.set(ARTICLES_URL, new Response('cached-body', { status: 200 }))

      const { handler, res } = await callArticles()

      expect(match).toHaveBeenCalledOnce()
      expect(handler).not.toHaveBeenCalled()
      expect(await res.text()).toBe('cached-body')
    })

    it('キャッシュヒット時は後続ミドルウェアがヘッダを変更できる応答を返すこと', async () => {
      // Cache API が返す Response はヘッダが immutable。これをそのまま返すと後続の
      // secureHeaders がヘッダを付与できず "Can't modify immutable headers" で 5xx になる。
      // workerd では Response.redirect のヘッダが immutable になるため Cache API 応答の代用にする
      vi.stubGlobal('caches', {
        default: {
          match: vi.fn(async () => Response.redirect('https://example.com/redirect', 302)),
          put: vi.fn(),
        },
      })

      // next 後にヘッダを付与する外側ミドルウェアで secureHeaders を模し、実際のチェーンを走らせる
      const app = new Hono<Env>()
        .use(async (c, next) => {
          await next()
          c.res.headers.set('X-Frame-Options', 'DENY')
        })
        .use('/api/articles/*', articleCache)

      const res = await app.request(
        ARTICLES_URL,
        { method: 'GET' },
        { ...TEST_ENV, EDGE_CACHE_DISABLED: undefined },
      )

      expect(res.status).toBe(302)
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    })
  })

  describe('準正常系', () => {
    it.each([
      { name: 'セッション Cookie 付き', options: { cookie: 'sb-abcd-auth-token=xyz; theme=dark' } },
      { name: 'EDGE_CACHE_DISABLED が有効', options: { disabled: true } },
      { name: 'GET 以外', options: { method: 'POST' } },
    ])('$name はキャッシュせず素通しすること', async ({ options }) => {
      const { match, put } = stubEdgeCache()
      await callArticles(options)

      expect(match).not.toHaveBeenCalled()
      expect(put).not.toHaveBeenCalled()
    })

    it('200 以外の応答はキャッシュしないこと', async () => {
      const { put } = stubEdgeCache()
      const { handler } = await callArticles({ handlerStatus: 500 })

      expect(handler).toHaveBeenCalledOnce()
      expect(put).not.toHaveBeenCalled()
    })
  })
})
