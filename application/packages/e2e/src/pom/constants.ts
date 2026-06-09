export const TIMEOUT = 10_000
// 初回ナビゲーションは cold start の dev サーバーがルートを都度コンパイルするため、
// 通常の待機より長く許容してコールドスタート由来の flaky を防ぐ
export const INITIAL_LOAD_TIMEOUT = 30_000
export const AUTH_FLOW_TIMEOUT = 20_000
export const SUPPORTED_ARTICLE_URL_PATTERN =
  /^https:\/\/(?:qiita\.com|zenn\.dev|b\.hatena\.ne\.jp)\//
