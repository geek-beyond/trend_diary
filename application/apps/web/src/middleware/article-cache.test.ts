import type { Context, Next } from 'hono'
import type { Mock } from 'vitest'
import type { Env } from '@/env'
import articleCache, { ARTICLE_CACHE_TTL_SECONDS } from './article-cache'
import { getEdgeCache } from './edge-cache'

vi.mock('./edge-cache', () => ({ getEdgeCache: vi.fn() }))

// Cache API を模した最小のインメモリ実装
function buildFakeCache(): {
  cache: Cache
  match: Mock
  put: Mock
  store: Map<string, Response>
} {
  const store = new Map<string, Response>()
  const match = vi.fn(async (request: Request) => {
    const cached = store.get(request.url)
    return cached ? cached.clone() : undefined
  })
  const put = vi.fn(async (request: Request, response: Response) => {
    store.set(request.url, response)
  })
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Cache を組み立てるため
  const cache = { match, put } as unknown as Cache
  return { cache, match, put, store }
}

interface ContextOverrides {
  method?: string
  url?: string
  cookie?: string
  res?: Response
  cacheEnabled?: string
}

function buildContext(overrides: ContextOverrides = {}): {
  c: Context<Env>
  next: Mock<Next>
  waitUntil: Mock
} {
  const {
    method = 'GET',
    url = 'https://example.com/api/articles?page=1',
    cookie,
    res = new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
    cacheEnabled = 'true',
  } = overrides
  const waitUntil = vi.fn()
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  const c = {
    env: { EDGE_CACHE_ENABLED: cacheEnabled },
    req: {
      method,
      url,
      header: (name: string) => (name === 'Cookie' ? cookie : undefined),
    },
    res,
    executionCtx: { waitUntil },
  } as unknown as Context<Env>
  const next: Mock<Next> = vi.fn(async () => {})
  return { c, next, waitUntil }
}

describe('articleCache ミドルウェア', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('未ログインの GET はキャッシュミス時に next を実行し、200 応答を保存すること', async () => {
      const { cache, put, store } = buildFakeCache()
      vi.mocked(getEdgeCache).mockReturnValue(cache)
      const { c, next, waitUntil } = buildContext()

      await articleCache(c, next)

      expect(next).toHaveBeenCalledOnce()
      expect(waitUntil).toHaveBeenCalledOnce()
      expect(put).toHaveBeenCalledOnce()
      expect(store.size).toBe(1)
    })

    it('保存する応答に Cache-Control(s-maxage) を付与すること', async () => {
      const { cache, store } = buildFakeCache()
      vi.mocked(getEdgeCache).mockReturnValue(cache)
      const { c, next } = buildContext()

      await articleCache(c, next)

      const stored = store.get('https://example.com/api/articles?page=1')
      expect(stored?.headers.get('Cache-Control')).toBe(
        `public, s-maxage=${ARTICLE_CACHE_TTL_SECONDS}`,
      )
    })

    it('キャッシュヒット時は next を実行せずキャッシュ応答を返すこと', async () => {
      const { cache, store, match } = buildFakeCache()
      store.set(
        'https://example.com/api/articles?page=1',
        new Response('cached-body', { status: 200 }),
      )
      vi.mocked(getEdgeCache).mockReturnValue(cache)
      const { c, next } = buildContext()

      const result = await articleCache(c, next)

      expect(match).toHaveBeenCalledOnce()
      expect(next).not.toHaveBeenCalled()
      expect(result).toBeInstanceOf(Response)
      if (!(result instanceof Response)) throw new Error('Response が返るはず')
      expect(await result.text()).toBe('cached-body')
    })
  })

  describe('準正常系', () => {
    it.each([
      {
        name: 'セッション Cookie 付き',
        overrides: { cookie: 'sb-abcd-auth-token=xyz; theme=dark' },
      },
      { name: 'EDGE_CACHE_ENABLED が無効', overrides: { cacheEnabled: 'false' } },
      { name: 'GET 以外', overrides: { method: 'POST' } },
    ])('$name はキャッシュせず素通しすること', async ({ overrides }) => {
      const { cache, match, put } = buildFakeCache()
      vi.mocked(getEdgeCache).mockReturnValue(cache)
      const { c, next } = buildContext(overrides)

      await articleCache(c, next)

      expect(next).toHaveBeenCalledOnce()
      expect(match).not.toHaveBeenCalled()
      expect(put).not.toHaveBeenCalled()
    })

    it('200 以外の応答はキャッシュしないこと', async () => {
      const { cache, put } = buildFakeCache()
      vi.mocked(getEdgeCache).mockReturnValue(cache)
      const res = new Response('error', { status: 500 })
      const { c, next } = buildContext({ res })

      await articleCache(c, next)

      expect(next).toHaveBeenCalledOnce()
      expect(put).not.toHaveBeenCalled()
    })
  })
})
