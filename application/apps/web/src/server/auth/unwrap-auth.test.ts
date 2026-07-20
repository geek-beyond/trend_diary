import { InvalidCredentialsError, UnexpectedAuthError } from '@trend-diary/authentication'
import Logger from '@trend-diary/logger'
import { HTTPException } from 'hono/http-exception'
import { err, ok } from 'neverthrow'
import { unwrapAuth } from './unwrap-auth'

const logger = new Logger('silent')

// oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けない
const captureThrow = (fn: () => unknown): unknown => {
  try {
    fn()
    return undefined
  } catch (e) {
    return e
  }
}

describe('unwrapAuth', () => {
  describe('正常系', () => {
    it('ok のとき中身の値を返すこと', () => {
      expect(unwrapAuth(ok({ id: 'user-1' }), logger)).toEqual({ id: 'user-1' })
    })
  })

  describe('準正常系', () => {
    it('認証情報不正は toAuthError で 401 の HTTPException を送出すること', () => {
      const thrown = captureThrow(() =>
        unwrapAuth(err(new InvalidCredentialsError('invalid')), logger),
      )

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(401)
    })
  })

  describe('異常系', () => {
    it('対応表に無い AuthError は ServerError 相当の 500 を送出すること', () => {
      const thrown = captureThrow(() => unwrapAuth(err(new UnexpectedAuthError('boom')), logger))

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(500)
    })
  })
})
