import { useEffect, useRef, useState } from 'react'
import { completionPendingStorage } from '@/client/features/inbox/model/completion-pending-storage'
import useDocumentVisibility from './use-document-visibility'

const CompletionDisplayDurationMs = 2500

interface Params {
  remaining: number
  queueLength: number
  // 新しいバッチを取得したことを判別するための参照。変化したらデータ起因の0件とみなす
  // oxlint-disable-next-line typescript/no-restricted-types -- 変化の有無だけを見る opaque トークンで、中身の型に依存しないため
  batchToken: unknown
}

// 未読を消化しきった瞬間だけ完了演出を出すためのフック。
// 「操作で消化した」事実は actionConsumedRef が持ち、それが立つのは表示中の記事を
// 消化した時＝直前まで remaining>0 だった時に限る。データ起因の0件では立てない。
export default function useCompletionCelebration({ remaining, queueLength, batchToken }: Params) {
  const [isJustCompleted, setIsJustCompleted] = useState(false)
  const actionConsumedRef = useRef(false)
  const visibilityState = useDocumentVisibility()

  // 表示中の記事を操作で消化したことを伝える。完了演出の発火条件になる
  const notifyConsumed = () => {
    actionConsumedRef.current = true
  }

  useEffect(() => {
    // 新しいバッチ取得でリセットし、データ起因の0件で演出が出ないようにする
    actionConsumedRef.current = false
  }, [batchToken])

  useEffect(() => {
    const reachedZeroByAction = remaining === 0 && actionConsumedRef.current
    const shouldPlayCompletion =
      reachedZeroByAction || (remaining === 0 && completionPendingStorage.has())

    if (shouldPlayCompletion && visibilityState === 'visible') {
      setIsJustCompleted(true)
      completionPendingStorage.set(false)
    } else if (reachedZeroByAction) {
      // 操作直後にタブが非表示（別タブで読了等）なら、復帰時に演出を再生するため保留にする
      completionPendingStorage.set(true)
    }

    actionConsumedRef.current = false
  }, [remaining, visibilityState])

  useEffect(() => {
    // タブ復帰時、保留中の完了演出を再生する
    if (visibilityState !== 'visible') return
    if (queueLength !== 0) return
    if (!completionPendingStorage.has()) return

    setIsJustCompleted(true)
    completionPendingStorage.set(false)
  }, [visibilityState, queueLength])

  useEffect(() => {
    if (!isJustCompleted) return

    const timerId = window.setTimeout(() => {
      setIsJustCompleted(false)
    }, CompletionDisplayDurationMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [isJustCompleted])

  return { isJustCompleted, notifyConsumed }
}
