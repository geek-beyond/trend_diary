import Logger from '@trend-diary/common/logger'
import type { LoaderFunctionArgs } from 'react-router'
import { Outlet, useLoaderData } from 'react-router'
import { createAuthActionUseCase } from '@/client/features/authenticate/auth-action-use-case'
import { SidebarProvider } from '../components/shadcn/sidebar'
import AppHeader from '../components/ui/layout/app-header'
import AppSidebar from '../components/ui/layout/sidebar'

export interface AppLayoutOutletContext {
  isLoggedIn: boolean
}

const logger = new Logger('info', { route: 'web/client/routes/app-layout/loader' })

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const { useCase } = createAuthActionUseCase(request, context)
    const result = await useCase.getCurrentActiveUser()
    return { isLoggedIn: result.isOk() }
  } catch (error) {
    // 認証設定不備などで loader が 500 になると配下の全画面が落ちるため、未ログイン扱いにフォールバックする
    logger.error('Unexpected error in app-layout loader', error)
    return { isLoggedIn: false }
  }
}

export default function AppLayout() {
  const { isLoggedIn } = useLoaderData<typeof loader>()

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
