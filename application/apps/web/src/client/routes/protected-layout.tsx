import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/client/entities/auth'
import type { AppLayoutOutletContext } from './app-layout'

export default function ProtectedLayout() {
  const { isLoggedIn, isLoading } = useSession()
  const location = useLocation()

  // セッション確定までは配下を描画しない。ログイン判定が定まる前に描画すると
  // 未ログイン画面が一瞬表示されてしまうため、確定後にのみ描画する
  if (isLoading) {
    return null
  }

  // 未ログイン（初回アクセス・セッション切れの両方を含む）ならログイン画面へ誘導し、
  // 再ログイン後に戻れるよう元のパスをクエリパラメータで引き継ぐ
  if (!isLoggedIn) {
    const redirectTo = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />
  }

  const outletContext: AppLayoutOutletContext = {
    isLoggedIn,
  }

  return <Outlet context={outletContext} />
}
