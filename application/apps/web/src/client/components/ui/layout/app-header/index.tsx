import { Menu, TrendingUp } from 'lucide-react'
import { Button } from '@/client/components/shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/client/components/shadcn/sheet'
import { getVisibleMenuItems } from '@/client/components/ui/layout/sidebar'
import { AnchorLink } from '@/client/components/ui/navigation/link'
import NavMenu from '@/client/components/ui/navigation/nav-menu'
import { LogoutButton } from '@/client/features/authenticate/logout'

interface Props {
  isLoggedIn: boolean
}

export default function AppHeader({ isLoggedIn }: Props) {
  const visibleMenuItems = getVisibleMenuItems(isLoggedIn)

  return (
    <header className='border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 md:hidden'>
      <div className='flex justify-between items-center h-16 px-4'>
        <AnchorLink to='/' className='flex items-center gap-2 hover:opacity-80 transition-opacity'>
          <TrendingUp className='h-6 w-6 text-blue-600' />
          <span className='text-xl font-semibold'>TrendDiary</span>
        </AnchorLink>

        <Sheet>
          <SheetTrigger asChild={true}>
            <Button variant='ghost' size='icon'>
              <Menu className='h-6 w-6' />
              <span className='sr-only'>メニューを開く</span>
            </Button>
          </SheetTrigger>
          <SheetContent side='right'>
            <SheetHeader>
              <SheetTitle>メニュー</SheetTitle>
              <SheetDescription>ナビゲーションとユーザー設定</SheetDescription>
            </SheetHeader>
            <div className='flex flex-col gap-4 flex-1'>
              <NavMenu variant='sheet' menuItems={visibleMenuItems} />

              {isLoggedIn && (
                <div className='border-t pt-4 mt-auto'>
                  <div className='flex flex-col gap-2 px-3'>
                    <LogoutButton />
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
