import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/client/components/shadcn/sidebar'
import useLogout from './use-logout'

export default function SidebarLogoutButton() {
  const { handleLogout, isLoading } = useLogout()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={handleLogout} disabled={isLoading}>
          {isLoading ? 'ログアウト中...' : 'ログアウト'}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
