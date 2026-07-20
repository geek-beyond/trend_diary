import type { LoggerType } from '@trend-diary/logger'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'

// 認証系ハンドラーのコールバックへ渡す最小コンテキスト。json はミドルウェア検証済みだが Hono の型では
// 静的に確定できないため、ハンドラー側が TJson を注釈して具象化する(handler-factory.ts の RequestContext
// と同じ思想)。
// oxlint-disable-next-line typescript/no-restricted-types -- ハンドラ側で TJson を具象化するまでの既定値で、任意形状を受け入れる必要があるため
export interface AuthHandlerContext<TJson = unknown> {
  c: Context<Env>
  json: TJson
  logger: LoggerType
}

// ミドルウェア検証済みだが Hono のジェネリック Context では静的に解決できない json を取り出す。
// 型ハックはこの一点に閉じ込める(handler-factory.ts の extractValidatedData と同じ方針)。
function extractValidatedJson(c: Context<Env>) {
  // valid は内部で this(c.req)を参照するため、変数へ取り出すとレシーバが外れて壊れる。bind で固定する。
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- ジェネリックな Context では valid() の引数型が never へ潰れ、戻り値も検証前の未確定な値のため
  const valid = c.req.valid.bind(c.req) as (key: 'json') => unknown
  return valid('json')
}

// 検証済み json をハンドラー注釈の TJson へ橋渡しする唯一の地点(handler-factory の buildRequestContext と同方針)。
export function buildContext<TJson>(c: Context<Env>): AuthHandlerContext<TJson> {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- ミドルウェア検証済みの json をジェネリックな TJson へ橋渡しするため、静的型では表現できない
  return {
    c,
    json: extractValidatedJson(c),
    logger: mustGet(c, CONTEXT_KEY.APP_LOG),
  } as AuthHandlerContext<TJson>
}
