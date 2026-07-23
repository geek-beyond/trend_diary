import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'

// テスト間でSWRキャッシュを共有しないよう、毎回新しいproviderで包む
export default function SwrTestWrapper({ children }: { children: ReactNode }) {
  return createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    children,
  )
}
