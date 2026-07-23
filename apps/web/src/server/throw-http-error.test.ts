import { HTTPException } from 'hono/http-exception'
import { err, ok } from 'neverthrow'
import { describe, expect, it } from 'vitest'
import { captureThrow } from '@/test/helper/capture-throw'
import { unwrapOrThrowHttp } from './throw-http-error'

const throwAsBadRequest = (error: Error): never => {
  throw new HTTPException(400, { message: error.message })
}

// 各認証ハンドラが持っていた「err なら handleError、ok なら値」の分岐をこのヘルパへ集約したため、その契約をここで担保する
describe('Result の展開とエラー写像の委譲', () => {
  describe('正常系', () => {
    it('ok の場合は写像を呼ばずに値をそのまま返すこと', () => {
      expect(unwrapOrThrowHttp(ok('value'), throwAsBadRequest)).toBe('value')
    })
  })

  describe('準正常系', () => {
    it('err の場合は渡した写像へ委譲して送出すること', () => {
      const error = new Error('boom')

      const thrown = captureThrow(() => unwrapOrThrowHttp(err(error), throwAsBadRequest))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 400, message: error.message })
    })
  })
})
