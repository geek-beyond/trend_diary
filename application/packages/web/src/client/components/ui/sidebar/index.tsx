import { BarChart3, BookOpenCheck, Inbox, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router'
import { InternalPath } from '../../../routes'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from '../../shadcn/sidebar'
import { AnchorLink } from '../link'
import NavMenu from '../nav-menu'
import UserSection from '../user-section'
import useSidebar from './use-sidebar'

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

type Props = {
  isLoggedIn: boolean
}

export default function AppSidebar({ isLoggedIn }: Props) {
  const navigate = useNavigate()
  const { handleLogout, isLoading } = useSidebar(navigate)
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
                <UserSection variant='sidebar' onLogout={handleLogout} isLoading={isLoading} />
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    </div>
  )
}
