import { zValidator } from '@hono/zod-validator'
import type { Context, Env as HonoEnv, Input, MiddlewareHandler, ValidationTargets } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ZodSchema } from 'zod'
import { z } from 'zod'
import type { Env } from '../env'

// 参考: https://github.com/honojs/middleware/blob/main/packages/zod-validator/README.md
const zodValidator = <Target extends keyof ValidationTargets, T extends ZodSchema>(
  target: Target,
  schema: T,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      const errorMessages = z.flattenError(result.error).fieldErrors
      throw new HTTPException(422, {
        message: 'Invalid input',
        cause: errorMessages,
      })
    }
  })

export default zodValidator

// ルートに適用した zodValidator のチェーンから、検証済みハンドラーの Context を導出する。
// 各 validator が持つ in / out（param の transform 等で両者が分かれる場合も含む）を統合するため、
// ハンドラー側で対象と型のマップを手書きせず、適用した validator の型から一意に決まる
type InferValidatorInput<V> =
  V extends MiddlewareHandler<HonoEnv, string, infer I extends Input> ? I : never

// チェーン内の各 validator の in / out を Dir で切り替えて畳み込む
type MergeValidatedInput<
  Validators extends readonly MiddlewareHandler[],
  Dir extends 'in' | 'out',
> = Validators extends readonly [infer Head, ...infer Rest extends readonly MiddlewareHandler[]]
  ? (InferValidatorInput<Head> extends { [K in Dir]: infer T } ? T : {}) &
      MergeValidatedInput<Rest, Dir>
  : {}

export type ZodValidatedContext<
  Validators extends readonly MiddlewareHandler[],
  Path extends string = '',
> = Context<
  Env,
  Path,
  {
    in: MergeValidatedInput<Validators, 'in'>
    out: MergeValidatedInput<Validators, 'out'>
  }
>
