import { Hono } from 'hono'
import type { Env } from '@/env'
import TEST_ENV from '@/test/env'
import passkeyGate from './passkey-gate'

// ゲート単体の挙動を検証する。実Supabase・supa-emuに依存させないため、
// 後続ハンドラはダミーにして next() へ到達したかだけを見る。
const app = new Hono<Env>().get('/gated', passkeyGate, (c) => c.json({ ok: true }))

function request(passkeyEnabled?: string) {
  return app.request('/gated', {}, { ...TEST_ENV, PASSKEY_ENABLED: passkeyEnabled })
}

describe('passkeyGate', () => {
  describe('正常系', () => {
    it('PASSKEY_ENABLED=true なら後続へ進む', async () => {
      const res = await request('true')
      expect(res.status).toBe(200)
    })
  })

  describe('準正常系', () => {
    const testCases: Array<{ name: string; value: string | undefined }> = [
      { name: 'false', value: 'false' },
      { name: '未設定', value: undefined },
      { name: 'TRUE(大文字)は厳密一致しない', value: 'TRUE' },
    ]

    testCases.forEach(({ name, value }) => {
      it(`PASSKEY_ENABLEDが${name}なら機能を隠すため404を返す`, async () => {
        const res = await request(value)
        expect(res.status).toBe(404)
      })
    })
  })
})
