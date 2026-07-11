import { Outlet } from 'react-router'
import { useSession } from '@/client/entities/auth'
import { SidebarProvider } from '../components/shadcn/sidebar'
import AppHeader from '../components/ui/layout/app-header'
import AppSidebar from '../components/ui/layout/sidebar'

export interface AppLayoutOutletContext {
  isLoggedIn: boolean
}

export default function AppLayout() {
  const { isLoggedIn } = useSession()

  const outletContext: AppLayoutOutletContext = {
    isLoggedIn,
  }

  return (
    <SidebarProvider>
      <AppSidebar isLoggedIn={isLoggedIn} />
      {/* ヘッダーの高さ分だけ配下が viewport をはみ出し不要なスクロールが出るのを防ぐため、
          縦 flex にして配下ページが残りの高さを埋められるようにする */}
      <div className='flex min-h-svh w-full flex-col'>
        <AppHeader isLoggedIn={isLoggedIn} />
        <Outlet context={outletContext} />
      </div>
    </SidebarProvider>
  )
}
