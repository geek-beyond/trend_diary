import { getEdgeCache } from './edge-cache'

describe('getEdgeCache', () => {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- グローバルの caches をテストで差し替えるため
  const globalWithCaches = globalThis as { caches?: unknown }

  afterEach(() => {
    delete globalWithCaches.caches
  })

  describe('正常系', () => {
    it('Workers ランタイムでは caches.default を返すこと', () => {
      const defaultCache = { name: 'default-cache' }
      globalWithCaches.caches = { default: defaultCache }

      expect(getEdgeCache()).toBe(defaultCache)
    })
  })

  describe('準正常系', () => {
    it('caches が存在しない環境では undefined を返すこと', () => {
      delete globalWithCaches.caches

      expect(getEdgeCache()).toBeUndefined()
    })
  })
})
