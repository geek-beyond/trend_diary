import { Outlet } from 'react-router'
import { PasskeyRegisterPrompt, useSession } from '@/client/features/authenticate'
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
      <div className='w-full'>
        <AppHeader isLoggedIn={isLoggedIn} />
        <PasskeyRegisterPrompt />
        <Outlet context={outletContext} />
      </div>
    </SidebarProvider>
  )
}
