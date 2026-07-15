import { z } from 'zod'
import { disableZodJitForStrictCsp, ZOD_JITLESS_BOOTSTRAP_SCRIPT } from './zod'

describe('disableZodJitForStrictCsp', () => {
  describe('正常系', () => {
    it('Zodのグローバル設定でjitlessを有効化し、parse時のeval試行を止める', () => {
      disableZodJitForStrictCsp()

      // jitlessが有効なら Zod は Function('') によるeval可否試行をスキップする
      expect(z.config().jitless).toBe(true)
    })
  })
})

describe('ZOD_JITLESS_BOOTSTRAP_SCRIPT', () => {
  describe('正常系', () => {
    it('Zodが共有設定を読む globalThis.__zod_globalConfig へ jitless を設定する', () => {
      // Zod はこのグローバルを ??= で初期化するため、バンドル読込前にこの形で書けている必要がある。
      // キー名・形が変わると判定スキップが効かず eval 試行が復活するため、内容を固定する
      expect(ZOD_JITLESS_BOOTSTRAP_SCRIPT).toBe('globalThis.__zod_globalConfig={jitless:true}')
    })
  })
})
