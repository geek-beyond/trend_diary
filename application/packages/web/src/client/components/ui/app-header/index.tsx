import { Menu, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '../../shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../shadcn/sheet'
import { AnchorLink } from '../link'
import NavMenu from '../nav-menu'
import { getVisibleMenuItems } from '../sidebar'
import useSidebar from '../sidebar/use-sidebar'
import UserSection from '../user-section'

type Props = {
  isLoggedIn: boolean
}

export default function AppHeader({ isLoggedIn }: Props) {
  const navigate = useNavigate()
  const { handleLogout, isLoading } = useSidebar(navigate)
  const visibleMenuItems = getVisibleMenuItems(isLoggedIn)

  return (
    <header className='border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50 md:hidden'>
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
            <div className='flex flex-col gap-4'>
              <NavMenu variant='sheet' menuItems={visibleMenuItems} />

              {isLoggedIn && (
                <UserSection variant='sheet' onLogout={handleLogout} isLoading={isLoading} />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
