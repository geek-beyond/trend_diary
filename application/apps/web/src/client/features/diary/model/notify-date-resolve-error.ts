import { toast } from 'sonner'
import { TOAST_ID } from '@/client/entities/auth'

export const DATE_RESOLVE_ERROR_MESSAGE =
  'JST日付の解決に失敗しました。時間をおいて再読み込みしてください。'

// 今日の JST 日付を組み立てられないと画面の前提が崩れるため、取得エラーと同様トーストで案内する。
// 再フェッチでは回復せず再読み込みしか手段がないため再試行アクションは持たせず、id で1つに集約して無期限表示する
export function notifyDateResolveError() {
  toast.error(DATE_RESOLVE_ERROR_MESSAGE, {
    id: TOAST_ID.DATE_RESOLVE_ERROR,
    duration: Infinity,
  })
}

export function dismissDateResolveError() {
  toast.dismiss(TOAST_ID.DATE_RESOLVE_ERROR)
}
