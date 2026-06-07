import { TrendingUp } from 'lucide-react'
import { AnchorLink } from '../link'

export default function LandingHeader() {
  return (
    <header className='border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          <AnchorLink
            to='/'
            className='flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity'
          >
            <TrendingUp className='h-6 w-6 sm:h-8 sm:w-8 text-blue-600' />
            <h1 className='text-lg sm:text-2xl font-bold text-slate-900'>TrendDiary</h1>
          </AnchorLink>
          <div className='flex items-center gap-2 sm:gap-4'>
            <AnchorLink
              to='/login'
              className='inline-flex items-center px-2.5 py-1.5 sm:px-4 sm:py-2 border border-slate-300 rounded-md text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors duration-200'
            >
              ログイン
            </AnchorLink>
            <AnchorLink
              to='/signup'
              className='inline-flex items-center px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors duration-200'
            >
              アカウント作成
            </AnchorLink>
          </div>
        </div>
      </div>
    </header>
  )
}
