// アプリ全体のトースト id を1箇所で集約し、機能をまたいだ id の衝突を防ぐ。
// 同一 id のトーストは重ならず1つに集約されるため、id の一意性はここで担保する
export const TOAST_ID = {
  SESSION_EXPIRED: 'session-expired',
  ARTICLES_ERROR: 'articles-error',
  DIARY_ERROR: 'diary-error',
  DIARY_ANALYTICS_ERROR: 'diary-analytics-error',
  UNREAD_DIGESTION_ERROR: 'unread-digestion-error',
} as const

export type ToastId = (typeof TOAST_ID)[keyof typeof TOAST_ID]
