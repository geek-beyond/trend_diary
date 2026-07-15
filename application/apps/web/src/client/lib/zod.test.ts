import { z } from 'zod'
import { disableZodJitForStrictCsp } from './zod'

describe('disableZodJitForStrictCsp', () => {
  describe('正常系', () => {
    it('Zodのグローバル設定でjitlessを有効化し、parse時のeval試行を止める', () => {
      disableZodJitForStrictCsp()

      // jitlessが有効なら Zod は Function('') によるeval可否試行をスキップする
      expect(z.config().jitless).toBe(true)
    })
  })
})
