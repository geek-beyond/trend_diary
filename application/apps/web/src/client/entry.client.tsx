/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to,
 * but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */

import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { disableZodJitForStrictCsp } from '@/client/lib/zod'

// ハイドレーション前に呼び、最初の parse より先に Zod の eval 試行を止める
disableZodJitForStrictCsp()

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  )
})
