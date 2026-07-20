import { TrendingUp } from 'lucide-react'
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
import { getVisibleMenuItems } from '@/client/entities/navigation'
import { SidebarLogoutButton } from '@/client/features/sessions'

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
            className='flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-md transition-colors'
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
                <SidebarLogoutButton />
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    </div>
  )
}
