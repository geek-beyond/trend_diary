export const TIMEOUT = 10_000
export const AUTH_FLOW_TIMEOUT = 20_000
// 新規登録〜ログインは複数ページ遷移を跨ぐため、単一遷移の上限を複数回分見込む
export const AUTH_SCENARIO_TIMEOUT = AUTH_FLOW_TIMEOUT * 3
export const SUPPORTED_ARTICLE_URL_PATTERN =
  /^https:\/\/(?:qiita\.com|zenn\.dev|b\.hatena\.ne\.jp)\//
