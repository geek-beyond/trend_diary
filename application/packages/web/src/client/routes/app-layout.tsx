import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { SidebarProvider } from '../components/shadcn/sidebar'
import AppHeader from '../components/ui/app-header'
import AppSidebar from '../components/ui/sidebar'
import getApiClientForClient from '../infrastructure/api'

export type AppLayoutOutletContext = {
  isLoggedIn: boolean
}

export default function AppLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    let isCancelled = false
    const client = getApiClientForClient()

    const fetchAuthState = async () => {
      const res = await client.auth.me.$get({}, { init: { credentials: 'include' } })
      if (!isCancelled) {
        setIsLoggedIn(res.status === 200)
      }
    }

    fetchAuthState().catch(() => {
      if (!isCancelled) {
        setIsLoggedIn(false)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [])

  const outletContext: AppLayoutOutletContext = {
    isLoggedIn,
  }

  return (
    <SidebarProvider>
      <AppSidebar isLoggedIn={isLoggedIn} />
      <div className='w-full'>
        <AppHeader isLoggedIn={isLoggedIn} />
        <Outlet context={outletContext} />
      </div>
    </SidebarProvider>
  )
}
