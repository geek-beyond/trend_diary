import { Button } from '../../shadcn/button'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../shadcn/sidebar'

type UserSectionProps = {
  variant: 'sidebar' | 'sheet'
  onLogout: () => void
  isLoading: boolean
}

export default function UserSection({ variant, onLogout, isLoading }: UserSectionProps) {
  if (variant === 'sidebar') {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={onLogout} disabled={isLoading}>
            {isLoading ? 'ログアウト中...' : 'ログアウト'}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <div className='border-t pt-4 mt-auto'>
      <div className='flex flex-col gap-2 px-3'>
        <Button onClick={onLogout} disabled={isLoading} variant='outline'>
          {isLoading ? 'ログアウト中...' : 'ログアウト'}
        </Button>
      </div>
    </div>
  )
}
