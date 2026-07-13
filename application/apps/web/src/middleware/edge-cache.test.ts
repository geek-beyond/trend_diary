import { getEdgeCache } from './edge-cache'

describe('getEdgeCache', () => {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- グローバルの caches をテストで差し替えるため
  const globalWithCaches = globalThis as { caches?: unknown }

  afterEach(() => {
    delete globalWithCaches.caches
  })

  it('caches.default を返すこと', () => {
    const defaultCache = { name: 'default-cache' }
    globalWithCaches.caches = { default: defaultCache }

    expect(getEdgeCache()).toBe(defaultCache)
  })
})
