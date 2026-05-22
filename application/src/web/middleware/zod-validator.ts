import { zValidator } from '@hono/zod-validator'
import type { Context, ValidationTargets } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z, ZodSchema } from 'zod'
import { Env } from '../env'

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

// zodValidatorの型は自動推論が厳しかったため、何度も書きそうなベタガキを共通化
type ZodValidatedContextBase<T, K extends keyof ValidationTargets, P extends string = ''> = Context<
  Env,
  P,
  {
    in: {
      [Key in K]: T
    }
    out: {
      [Key in K]: T
    }
  }
>

export type ZodValidatedContext<T, P extends string = ''> = ZodValidatedContextBase<T, 'json', P>

export type ZodValidatedQueryContext<T, P extends string = ''> = ZodValidatedContextBase<
  T,
  'query',
  P
>

export type ZodValidatedParamContext<T, P extends string = ''> = ZodValidatedContextBase<
  T,
  'param',
  P
>

export type ZodValidatedParamJsonContext<ParamType, JsonType, P extends string = ''> = Context<
  Env,
  P,
  {
    in: {
      param: ParamType
      json: JsonType
    }
    out: {
      param: ParamType
      json: JsonType
    }
  }
>
