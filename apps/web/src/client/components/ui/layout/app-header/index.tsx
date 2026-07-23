import { TrendingUp } from 'lucide-react'
import NavSheet from '@/client/components/ui/layout/nav-sheet'
import { AnchorLink } from '@/client/components/ui/navigation/link'

interface Props {
  isLoggedIn: boolean
}

export default function AppHeader({ isLoggedIn }: Props) {
  return (
    <header className='border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 md:hidden'>
      <div className='flex justify-between items-center h-16 px-4'>
        <AnchorLink to='/' className='flex items-center gap-2 hover:opacity-80 transition-opacity'>
          <TrendingUp className='h-6 w-6 text-blue-600' />
          <span className='text-xl font-semibold'>TrendDiary</span>
        </AnchorLink>

        <NavSheet isLoggedIn={isLoggedIn} />
      </div>
    </header>
  )
}
