import { z } from 'zod'

describe('configure-zod', () => {
  describe('正常系', () => {
    it('副作用としての読み込みでZodのjitlessが有効になる', async () => {
      await import('./configure-zod')

      expect(z.config().jitless).toBe(true)
    })
  })
})
