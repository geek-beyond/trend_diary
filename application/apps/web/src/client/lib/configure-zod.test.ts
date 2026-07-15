import { z } from 'zod'

describe('configure-zod', () => {
  beforeEach(() => {
    z.config({ jitless: false })
  })

  describe('正常系', () => {
    it('副作用としての読み込みでZodのjitlessが有効になる', async () => {
      // ESMのモジュールキャッシュを避けて副作用を確実に再評価させる。
      // クエリ付き動的importはViteの静的解析対象外のため @vite-ignore で素の動的importに委ねる
      await import(/* @vite-ignore */ `./configure-zod?bust=${Math.random()}`)

      expect(z.config().jitless).toBe(true)
    })
  })
})
