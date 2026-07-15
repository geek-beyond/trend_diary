import { ZOD_JITLESS_BOOTSTRAP_SCRIPT } from './zod'

describe('ZOD_JITLESS_BOOTSTRAP_SCRIPT', () => {
  describe('正常系', () => {
    it('Zodが共有設定を読む globalThis.__zod_globalConfig へ jitless を設定する', () => {
      // Zod はこのグローバルを ??= で初期化するため、バンドル読込前にこの形で書けている必要がある。
      // キー名・形が変わると判定スキップが効かず eval 試行が復活するため、内容を固定する
      expect(ZOD_JITLESS_BOOTSTRAP_SCRIPT).toBe('globalThis.__zod_globalConfig={jitless:true}')
    })
  })
})
