import { OAUTH_PROVIDERS } from '@trend-diary/authentication'
import { z } from 'zod'

// :provider パスパラメータの検証。対応プロバイダは authentication の定義元に従い、未対応は422に落とす
export const oauthProviderParamSchema = z.object({
  provider: z.enum(OAUTH_PROVIDERS),
})

export type OAuthProviderParam = z.infer<typeof oauthProviderParamSchema>
