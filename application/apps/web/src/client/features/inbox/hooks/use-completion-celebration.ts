import { useEffect, useState } from 'react'
import { completionPendingStorage } from '@/client/features/inbox/model/completion-pending-storage'

const CompletionDisplayDurationMs = 2500

interface Params {
  queueLength: number
}

// 未読を消化しきった瞬間だけ完了演出を出すためのフック。
// 完了は「操作で最後の1件を消化した」ときにだけ起こすべきなので、演出の発火はレンダーや Effect ではなく
// 呼び出し側のイベントハンドラ（notifyCompleted）から行う。これによりデータ起因の0件では発火しない。
export default function useCompletionCelebration({ queueLength }: Params) {
  const [isJustCompleted, setIsJustCompleted] = useState(false)

  // 操作で残り0になった瞬間に呼ぶ。可視なら即演出、非表示なら復帰時に再生するため保留にする
  const notifyCompleted = () => {
    if (document.visibilityState === 'visible') {
      setIsJustCompleted(true)
      completionPendingStorage.set(false)
    } else {
      completionPendingStorage.set(true)
    }
  }

  // タブ復帰時、保留中の完了演出を再生する。新しいバッチ到着でキューが埋まっていれば再生しない。
  // setState は Effect 本体ではなく visibilitychange のコールバック内で行うため、cascading render を招かない
  useEffect(() => {
    const replayPendingCelebration = () => {
      if (document.visibilityState !== 'visible') return
      if (queueLength !== 0) return
      if (!completionPendingStorage.has()) return

      setIsJustCompleted(true)
      completionPendingStorage.set(false)
    }

    document.addEventListener('visibilitychange', replayPendingCelebration)
    return () => {
      document.removeEventListener('visibilitychange', replayPendingCelebration)
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

  return { isJustCompleted, notifyCompleted }
}
