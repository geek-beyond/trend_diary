import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase, type ThemeUpdate } from '@trend-diary/domain/user'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'

export default async function updateTheme(c: ZodValidatedContext<ThemeUpdate>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const user = c.get(CONTEXT_KEY.SESSION_USER)
  const { theme } = c.req.valid('json')

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient(c.env.DB)
  const useCase = createAuthUseCase(client, rdb)

  const result = await useCase.updateTheme(user.activeUserId, theme)
  if (result.isErr()) throw handleError(result.error, logger)

  logger.info('update theme success', { activeUserId: user.activeUserId, theme })

  return c.json({ theme: result.value.theme }, 200)
}
