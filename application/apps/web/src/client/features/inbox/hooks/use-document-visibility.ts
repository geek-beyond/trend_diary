import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void) {
  document.addEventListener('visibilitychange', onStoreChange)
  return () => {
    document.removeEventListener('visibilitychange', onStoreChange)
  }
}

function getSnapshot() {
  return document.visibilityState
}

// SSR では可視扱いにし、ハイドレーション後のちらつきを避ける
function getServerSnapshot() {
  return 'visible' as const
}

export default function useDocumentVisibility() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
