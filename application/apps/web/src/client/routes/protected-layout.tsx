import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/client/entities/auth'

export default function ProtectedLayout() {
  const { isLoggedIn, isLoading } = useSession()
  const location = useLocation()

  // セッション確定までは配下を描画しない。ログイン判定が定まる前に描画すると
  // 未ログイン画面が一瞬表示されてしまうため、確定後にのみ描画する
  if (isLoading) {
    return null
  }

  // 初回アクセスかセッション切れかを区別せず同じ導線に寄せ、挙動を統一する
  if (!isLoggedIn) {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/sessions?redirect=${encodeURIComponent(redirectTo)}`} replace />
  }

  return <Outlet />
}
