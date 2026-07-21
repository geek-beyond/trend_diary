import { Menu } from 'lucide-react'
import { Button } from '@/client/components/shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/client/components/shadcn/sheet'
import NavMenu from '@/client/components/ui/navigation/nav-menu'
import { getVisibleMenuItems } from '@/client/entities/navigation'
import { LogoutButton } from '@/client/features/logout'

interface Props {
  isLoggedIn: boolean
}

export default function NavSheet({ isLoggedIn }: Props) {
  const visibleMenuItems = getVisibleMenuItems(isLoggedIn)

  return (
    <Sheet>
      <SheetTrigger asChild={true}>
        <Button variant='ghost' size='icon'>
          <Menu className='size-6' />
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
  )
}
