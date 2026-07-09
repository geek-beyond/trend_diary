import { Outlet } from 'react-router'
import { useSession } from '@/client/entities/auth'
import type { AppLayoutOutletContext } from './app-layout'

export default function ProtectedLayout() {
  const { isLoggedIn, isLoading } = useSession()

  // セッション確定までは配下を描画しない。ログイン判定が定まる前に描画すると
  // 未ログイン画面（LoginRequired）が一瞬表示されてしまうため、確定後にのみ描画する
  if (isLoading) {
    return null
  }

  const outletContext: AppLayoutOutletContext = {
    isLoggedIn,
  }

  return <Outlet context={outletContext} />
}
