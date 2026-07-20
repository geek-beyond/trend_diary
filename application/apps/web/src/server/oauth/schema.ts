import { OAUTH_PROVIDERS } from '@trend-diary/authentication'
import { oauthCallbackQuerySchema, oauthLoginQuerySchema } from '@trend-diary/domain/account'
import { z } from 'zod'
import zodValidator from '@/middleware/zod-validator'

// :provider パスパラメータの検証。対応プロバイダは authentication の定義元に従い、未対応は422に落とす
const oauthProviderParamSchema = z.object({
  provider: z.enum(OAUTH_PROVIDERS),
})

// param は全 OAuth ルートで共有するため単一の validator を使い回す
export const oauthProviderParamValidator = zodValidator('param', oauthProviderParamSchema)
export const oauthLoginQueryValidator = zodValidator('query', oauthLoginQuerySchema)
export const oauthCallbackQueryValidator = zodValidator('query', oauthCallbackQuerySchema)
