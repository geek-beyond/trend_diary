import { TrendingUp } from 'lucide-react'
import NavSheet from '@/client/components/ui/layout/nav-sheet'
import { AnchorLink } from '@/client/components/ui/navigation/link'

interface Props {
  // ログイン導線のみのページ（ログイン/新規登録/規約等）ではセッションを解決しないため、既定は未ログイン扱いとする
  isLoggedIn?: boolean
}

export default function LandingHeader({ isLoggedIn = false }: Props) {
  return (
    <header className='border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          <AnchorLink
            to='/'
            className='flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity'
          >
            <TrendingUp className='h-6 w-6 sm:h-8 sm:w-8 text-blue-600' />
            <h1 className='text-lg sm:text-2xl font-bold text-foreground'>TrendDiary</h1>
          </AnchorLink>
          {isLoggedIn ? (
            <NavSheet isLoggedIn={isLoggedIn} />
          ) : (
            <div className='flex items-center gap-2 sm:gap-4'>
              <AnchorLink
                to='/sessions'
                className='inline-flex items-center px-2.5 py-1.5 sm:px-4 sm:py-2 border border-border rounded-md text-xs sm:text-sm font-medium text-foreground bg-background hover:bg-accent transition-colors duration-200'
              >
                ログイン
              </AnchorLink>
              <AnchorLink
                to='/registrations'
                className='inline-flex items-center px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors duration-200'
              >
                アカウント作成
              </AnchorLink>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
