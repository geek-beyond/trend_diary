import { describe, expect, it, vi } from 'vitest'

describe('api', () => {
  describe('getApiClientForClient', () => {
    it('ブラウザ環境でAPIクライアントを取得できる', async () => {
      // ブラウザ環境をモック
      Object.defineProperty(global, 'document', {
        value: {},
        writable: true,
      })
      Object.defineProperty(global, 'window', {
        value: {
          location: {
            protocol: 'https:',
            host: 'example.com',
          },
        },
        writable: true,
      })

      // モジュールを動的にインポートしてブラウザ環境の条件を適用
      const { default: getApiClientForClient } = await import('./api')
      const result = getApiClientForClient()

      expect(result).toBeDefined()
    })

    it('サーバー環境でAPIクライアントを取得できる', async () => {
      // サーバー環境をモック（documentが存在しない）
      Object.defineProperty(global, 'document', {
        value: undefined,
        writable: true,
      })

      // モジュールを再インポート
      vi.resetModules()
      const { default: getApiClientForClient } = await import('./api')
      const result = getApiClientForClient()

      expect(result).toBeDefined()
    })

    it('関数が呼び出し可能である', async () => {
      const { default: getApiClientForClient } = await import('./api')

      expect(() => getApiClientForClient()).not.toThrow()
      expect(typeof getApiClientForClient).toBe('function')
    })
  })
})
