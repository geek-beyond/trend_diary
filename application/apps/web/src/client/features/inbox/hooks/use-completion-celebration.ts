import { useEffect, useState, useSyncExternalStore } from 'react'
import { completionPendingStorage } from '@/client/features/inbox/model/completion-pending-storage'

const CompletionDisplayDurationMs = 2500

interface Params {
  queueLength: number
}

// 未読を消化しきった瞬間だけ完了演出を出すためのフック。
// 完了は「操作で最後の1件を消化した」ときにだけ起こすべきなので、notifyCompleted で保留状態にし、
// 「可視・キュー空・保留中」が揃ったフレームでレンダー中に一度だけ演出を立てる。
export default function useCompletionCelebration({ queueLength }: Params) {
  const [isJustCompleted, setIsJustCompleted] = useState(false)
  // 保留は sessionStorage を初期値に持ち、以降は state を正とする。リロード・再マウントをまたいで復帰時再生を保つ
  const [isPending, setIsPending] = useState(() => completionPendingStorage.has())
  const visibilityState = useDocumentVisibility()

  // 操作で残り0になった瞬間に呼ぶ。復帰時再生に備えて保留状態にする
  const notifyCompleted = () => {
    setIsPending(true)
  }

  // 可視・キュー空・保留中が揃ったら演出を立てる。isPending が false へ収束するため無限ループにならない。
  // 可視状態は useSyncExternalStore で購読しているので、タブ復帰でも既に可視なマウントでも同じ経路で再生できる。
  // Effect 内の同期 setState（cascading render）を避けるため、レンダー中の収束する setState で判定する
  if (isPending && queueLength === 0 && visibilityState === 'visible') {
    setIsPending(false)
    setIsJustCompleted(true)
  }

  // 保留状態を sessionStorage に同期する（外部システムとの同期は Effect が本来の用途）
  useEffect(() => {
    completionPendingStorage.set(isPending)
  }, [isPending])

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

const subscribeVisibility = (onStoreChange: () => void) => {
  document.addEventListener('visibilitychange', onStoreChange)
  return () => {
    document.removeEventListener('visibilitychange', onStoreChange)
  }
}

const getVisibilitySnapshot = (): DocumentVisibilityState => document.visibilityState

// SSR とハイドレーション初回は hidden 扱いにし、可視依存の演出がハイドレーション不一致を起こさないようにする
const getVisibilityServerSnapshot = (): DocumentVisibilityState => 'hidden'

function useDocumentVisibility() {
  return useSyncExternalStore(
    subscribeVisibility,
    getVisibilitySnapshot,
    getVisibilityServerSnapshot,
  )
}
