import { Hono } from 'hono'
import { z } from 'zod'
import { apiRequest } from '@/test/helper/request'
import zodValidator from './zod-validator'

// zodValidator の 422 変換フックを検証するための最小ルート
const app = new Hono().post('/', zodValidator('json', z.object({ name: z.string() })), (c) =>
  c.json({ ok: true }),
)

// oxlint-disable-next-line typescript/no-restricted-types -- 検証成功・失敗の双方を試すため任意形状のボディを受けるため
function postJson(body: unknown) {
  return apiRequest('/', { method: 'POST', json: body, app })
}

describe('zodValidator', () => {
  describe('正常系', () => {
    it('検証に成功すると後続ハンドラーへ進むこと', async () => {
      const res = await postJson({ name: 'diary' })

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true })
    })
  })

  describe('準正常系', () => {
    it('検証に失敗すると422を返すこと', async () => {
      const res = await postJson({})

      expect(res.status).toBe(422)
    })
  })
})
