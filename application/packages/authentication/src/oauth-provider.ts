import { z } from 'zod'

// 対応するOAuthプロバイダの単一の定義元。認可クライアントのプロバイダ型とAPI層のparam検証が
// ここを参照するため、新規プロバイダ対応はこの配列への追記を起点にできる
export const OAUTH_PROVIDERS = ['github'] as const

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

// callback等のパスパラメータ検証。未対応プロバイダはAPI層で422に落とす
export const oauthProviderParamSchema = z.object({
  provider: z.enum(OAUTH_PROVIDERS),
})

export type OAuthProviderParam = z.infer<typeof oauthProviderParamSchema>
