import { createMiddleware } from 'hono/factory'
import type { Env } from '../env'
import { assertCaptchaVerified } from '../server/auth/captcha'
import CONTEXT_KEY from './context'

// signup / login の前段で Turnstile を検証する。zodValidator(json) の後段に置き、検証済みボディの
// captchaToken を使う(secret 未設定環境では assertCaptchaVerified が検証をスキップする)。
const captcha = createMiddleware<Env>(async (c, next) => {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  // 汎用ミドルウェアでは valid() の引数型が never へ潰れるため bind して captchaToken の形を補う
  // oxlint-disable-next-line typescript/consistent-type-assertions -- 上記のとおり検証済みボディの形を補うため
  const valid = c.req.valid.bind(c.req) as (key: 'json') => { captchaToken?: string }
  await assertCaptchaVerified(c.env.TURNSTILE_SECRET_KEY, valid('json').captchaToken, logger)
  return next()
})

export default captcha
