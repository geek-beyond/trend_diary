import getRdbClient from '@trend-diary/datastore/rdb'
import { isWithinDbIdRange } from '@trend-diary/datastore/rdb/id'
import { createArticleUseCase } from '@trend-diary/domain/article'
import { DIARY_DAYS } from '@trend-diary/domain/article/diary'
import { z } from 'zod'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { handleError } from '@/server/handle-error'

const MS_PER_MINUTE = 60 * 1000
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE

// クライアント端末の時計ずれを吸収するため、未来方向にこの幅だけ許容する
const READ_AT_FUTURE_TOLERANCE_MS = 5 * MS_PER_MINUTE
// 集計対象（ダイアリー窓）と整合させ、過去方向はこの範囲までのみ許容する
const READ_AT_PAST_WINDOW_MS = DIARY_DAYS * MS_PER_DAY

const READ_AT_FUTURE_MESSAGE = 'read_at must not be in the future'
const READ_AT_PAST_MESSAGE = `read_at must be within the last ${DIARY_DAYS} days`

// API用スキーマ
export const createReadHistoryApiSchema = z.object({
  read_at: z
    .string()
    .datetime()
    .superRefine((value, ctx) => {
      const time = Date.parse(value)
      const now = Date.now()
      if (time > now + READ_AT_FUTURE_TOLERANCE_MS) {
        ctx.addIssue({ code: 'custom', message: READ_AT_FUTURE_MESSAGE })
      }
      if (time < now - READ_AT_PAST_WINDOW_MS) {
        ctx.addIssue({ code: 'custom', message: READ_AT_PAST_MESSAGE })
      }
    }),
})

export const articleIdParamSchema = z.object({
  article_id: z
    .string()
    .min(1)
    .regex(/^\d+$/, { message: 'article_id must be a valid number' })
    .transform((val) => BigInt(val))
    // 範囲外は存在し得ない ID のため、toDbId の RangeError（500 と障害通知）に化けさせず
    // クライアントエラーに倒す。境界の定義は toDbId と共通の isWithinDbIdRange に集約されている
    .refine(isWithinDbIdRange, { message: 'article_id is out of range' }),
})

export const articleIdParamValidator = zodValidator('param', articleIdParamSchema)
export const createReadHistoryJsonValidator = zodValidator('json', createReadHistoryApiSchema)

// param + json の同時指定ではファクトリーの戻り値型を Hono client が解決できず json が欠落するため、
// 従来パターンで検証済みコンテキストを明示し、c.json の TypedResponse で RPC 型推論を保つ
export default async function readArticle(
  c: ZodValidatedContext<[typeof articleIdParamValidator, typeof createReadHistoryJsonValidator]>,
) {
  const logger = mustGet(c, CONTEXT_KEY.APP_LOG)
  const user = mustGet(c, CONTEXT_KEY.SESSION_USER)
  const { article_id } = c.req.valid('param')
  const { read_at } = c.req.valid('json')

  const rdb = getRdbClient(c.env.DB)
  const useCase = createArticleUseCase(rdb)

  const result = await useCase.createReadHistory(user.activeUserId, article_id, new Date(read_at))
  if (result.isErr()) {
    handleError(result.error, logger)
  }

  logger.info({
    msg: 'Read history created successfully',
    activeUserId: user.activeUserId,
    articleId: article_id,
  })

  return c.json({ message: '記事を既読にしました' }, 201)
}
