import { Button } from '@/client/components/shadcn/button'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/client/components/shadcn/sidebar'
import useLogout from '@/client/features/authenticate/hooks/use-logout'

interface Props {
  variant: 'sidebar' | 'sheet'
}

export default function LogoutButton({ variant }: Props) {
  const { handleLogout, isLoading } = useLogout()

  if (variant === 'sidebar') {
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

  return (
    <div className='border-t pt-4 mt-auto'>
      <div className='flex flex-col gap-2 px-3'>
        <Button onClick={handleLogout} disabled={isLoading} variant='outline'>
          {isLoading ? 'ログアウト中...' : 'ログアウト'}
        </Button>
      </div>
    </div>
  )
}
