import { toast } from 'sonner'
import { notifyErrorUnlessSessionExpired } from './session-expired'
import type { ToastId } from './toast-id'

export const FETCH_ERROR_MESSAGE = 'エラーが発生しました。時間をおいて再度お試しください。'

// SWR のフェッチ失敗を通知する共通トースト。id で1つに集約し、再試行アクションと
// 無期限表示を備える。セッション切れ(401)は notifySessionExpired 側の案内に委ね、
// ここでは重複表示しない
// oxlint-disable-next-line typescript/no-restricted-types -- JS は任意の値を throw でき、SWR から渡る失敗値の型を確定できないため
export function notifyFetchError(error: unknown, id: ToastId, retry: () => void) {
  notifyErrorUnlessSessionExpired(error, FETCH_ERROR_MESSAGE, {
    id,
    duration: Infinity,
    action: { label: '再試行', onClick: retry },
  })
}

// フェッチ成功時に、対応するエラートーストを閉じる
export function dismissFetchError(id: ToastId) {
  toast.dismiss(id)
}
