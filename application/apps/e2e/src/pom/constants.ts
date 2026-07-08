export const TIMEOUT = 10_000
export const AUTH_FLOW_TIMEOUT = 20_000
// 1回の送信操作あたり、本番の送信結果（URL遷移・エラー表示）を待つ上限。
// これを超えて結果が出ない場合はハイドレーション未完了によるクリック握り潰しとみなし fill+click を再試行する
export const SUBMIT_OUTCOME_TIMEOUT = 5_000
export const SUPPORTED_ARTICLE_URL_PATTERN =
  /^https:\/\/(?:qiita\.com|zenn\.dev|b\.hatena\.ne\.jp)\//
