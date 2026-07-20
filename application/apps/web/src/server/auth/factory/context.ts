import type { LoggerType } from '@trend-diary/logger'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'

// oxlint-disable-next-line typescript/no-restricted-types -- ハンドラ側で TJson を具象化するまでの既定値として任意形状を受ける
export interface AuthHandlerContext<TJson = unknown> {
  c: Context<Env>
  json: TJson
  logger: LoggerType
}

function extractValidatedJson(c: Context<Env>) {
  // valid は this(c.req)を参照するため bind でレシーバを固定する
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- ジェネリック Context では valid() の引数型が never へ潰れ、戻り値も検証前の未確定な値のため
  const valid = c.req.valid.bind(c.req) as (key: 'json') => unknown
  return valid('json')
}

export function buildContext<TJson>(c: Context<Env>): AuthHandlerContext<TJson> {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- 検証済み json をジェネリックな TJson へ橋渡しする唯一の地点
  return {
    c,
    json: extractValidatedJson(c),
    logger: mustGet(c, CONTEXT_KEY.APP_LOG),
  } as AuthHandlerContext<TJson>
}
