import { BarChart3, BookOpenCheck, Inbox, TrendingUp } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from '@/client/components/shadcn/sidebar'
import { AnchorLink } from '@/client/components/ui/navigation/link'
import NavMenu from '@/client/components/ui/navigation/nav-menu'
import { LogoutButton } from '@/client/features/authenticate'
import type { InternalPath } from '@/client/routes'

export interface MenuItem {
  title: string
  url: InternalPath
  icon: React.ElementType
}

export const menuItems: MenuItem[] = [
  {
    title: 'トレンド記事',
    url: '/trends',
    icon: TrendingUp,
  },
]

const loggedInMenuItems: MenuItem[] = [
  {
    title: '未読消化',
    url: '/inbox',
    icon: Inbox,
  },
  {
    title: 'ダイアリー',
    url: '/diary',
    icon: BookOpenCheck,
  },
  {
    title: '統計',
    url: '/analytics',
    icon: BarChart3,
  },
]

export function getVisibleMenuItems(isLoggedIn: boolean): MenuItem[] {
  return isLoggedIn ? [...menuItems, ...loggedInMenuItems] : menuItems
}

interface Props {
  isLoggedIn: boolean
}

export default function AppSidebar({ isLoggedIn }: Props) {
  const visibleMenuItems = getVisibleMenuItems(isLoggedIn)

  return (
    <div className='hidden md:block'>
      <Sidebar>
        <SidebarHeader>
          <AnchorLink
            to='/'
            className='flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-md transition-colors'
          >
            <TrendingUp className='h-8 w-8 text-blue-600' />
            <span className='text-xl font-semibold'>TrendDiary</span>
          </AnchorLink>
        </SidebarHeader>
        <SidebarContent className='relative'>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMenu variant='sidebar' menuItems={visibleMenuItems} />
            </SidebarGroupContent>
          </SidebarGroup>
          {isLoggedIn && (
            <SidebarGroup className='absolute bottom-0 left-0 w-full'>
              <SidebarGroupContent>
                <LogoutButton variant='sidebar' />
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    </div>
  )
}
