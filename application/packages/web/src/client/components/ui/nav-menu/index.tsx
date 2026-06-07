import { SheetClose } from '../../shadcn/sheet'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../shadcn/sidebar'
import { AnchorLink } from '../link'
import type { MenuItem } from '../sidebar'

type NavMenuProps = {
  variant: 'sidebar' | 'sheet'
  menuItems: MenuItem[]
}

export default function NavMenu({ variant, menuItems }: NavMenuProps) {
  if (variant === 'sidebar') {
    return (
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild={true}>
              <AnchorLink to={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </AnchorLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    )
  }

  return (
    <nav className='flex flex-col gap-2'>
      <div className='text-xs font-semibold text-gray-500 px-3'>Application</div>
      {menuItems.map((item) => (
        <SheetClose key={item.title} asChild={true}>
          <AnchorLink
            to={item.url}
            className='flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors'
          >
            <item.icon className='h-5 w-5' />
            <span>{item.title}</span>
          </AnchorLink>
        </SheetClose>
      ))}
    </nav>
  )
}
