// 対応するOAuthプロバイダの単一の定義元。認可クライアントのプロバイダ型がここを参照するため、
// 新規プロバイダ対応はこの配列への追記を起点にできる
export const OAUTH_PROVIDERS = ['github'] as const

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]
