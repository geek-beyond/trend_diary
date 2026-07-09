import { Outlet } from 'react-router'
import LoadingSpinner from '@/client/components/ui/feedback/loading-spinner'
import { useSession } from '@/client/entities/auth'
import type { AppLayoutOutletContext } from './app-layout'

export default function ProtectedLayout() {
  const { isLoggedIn, isLoading } = useSession()

  // セッション確定までは未ログイン画面のちらつきを避けるためローディングを表示する。
  // ここで一度だけ待つことで、配下の各ページはログイン確定後のみ描画され、
  // 画面側はデータ取得のローディング状態だけを扱えばよくなる
  if (isLoading) {
    return <LoadingSpinner />
  }

  const outletContext: AppLayoutOutletContext = {
    isLoggedIn,
  }

  return <Outlet context={outletContext} />
}
