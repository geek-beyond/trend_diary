import { zValidator } from '@hono/zod-validator'
import type { Context, ValidationTargets } from 'hono'
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

// zodValidatorの型は自動推論が厳しかったため、何度も書きそうなベタガキを共通化
type ValidatedFields = Partial<Record<keyof ValidationTargets, object>>

// 検証対象（query / param / json）→ 型のマップで in / out を指定する単一の汎用型。
// transform でリクエスト時（z.input）と検証後（z.output）の型が分かれる場合のみ Out を明示する
export type ZodValidatedContext<
  In extends ValidatedFields,
  Out extends ValidatedFields = In,
  Path extends string = '',
> = Context<
  Env,
  Path,
  {
    in: In
    out: Out
  }
>
