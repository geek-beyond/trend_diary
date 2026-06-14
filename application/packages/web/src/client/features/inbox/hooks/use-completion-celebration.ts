import { useEffect, useRef, useState } from 'react'

const CompletionPendingStorageKey = 'inbox-completion-pending'
const CompletionDisplayDurationMs = 2500

const setCompletionPending = (pending: boolean) => {
  try {
    if (pending) {
      window.sessionStorage.setItem(CompletionPendingStorageKey, '1')
      return
    }

    window.sessionStorage.removeItem(CompletionPendingStorageKey)
  } catch {
    // INFO: ストレージ利用不可環境では完了演出の遅延再生を無効化する
  }
}

const hasCompletionPending = () => {
  try {
    return window.sessionStorage.getItem(CompletionPendingStorageKey) === '1'
  } catch {
    return false
  }
}

interface Params {
  remaining: number
  queueLength: number
  // 新しいバッチを取得したことを判別するための参照。変化したらデータ起因の0件とみなす
  batchToken: unknown
}

// 未読を消化しきった瞬間だけ完了演出を出すためのフック。
// 「操作で消化した」事実は actionConsumedRef が持ち、それが立つのは表示中の記事を
// 消化した時＝直前まで remaining>0 だった時に限る。データ起因の0件では立てない。
export default function useCompletionCelebration({ remaining, queueLength, batchToken }: Params) {
  const [isJustCompleted, setIsJustCompleted] = useState(false)
  const actionConsumedRef = useRef(false)

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
    const shouldPlayCompletion = reachedZeroByAction || (remaining === 0 && hasCompletionPending())

    if (shouldPlayCompletion && document.visibilityState === 'visible') {
      setIsJustCompleted(true)
      setCompletionPending(false)
    } else if (reachedZeroByAction) {
      // 操作直後にタブが非表示（別タブで読了等）なら、復帰時に演出を再生するため保留にする
      setCompletionPending(true)
    }

    actionConsumedRef.current = false
  }, [remaining])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (queueLength !== 0) return
      if (!hasCompletionPending()) return

      setIsJustCompleted(true)
      setCompletionPending(false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [queueLength])

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
