import { useState, useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'
const getServerSnapshot = () => false

export function useIsMobile() {
  const [store] = useState(() => {
    const media = typeof window === 'undefined' ? undefined : window.matchMedia(MOBILE_QUERY)
    return {
      subscribe(onStoreChange: () => void) {
        media?.addEventListener('change', onStoreChange)
        return () => media?.removeEventListener('change', onStoreChange)
      },
      getSnapshot: () => media?.matches ?? false,
    }
  })
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot)
}
