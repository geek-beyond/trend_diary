import { Funnel } from 'lucide-react'
import { scrollToTop } from '@/client/lib/scroll'
import { type FilterParams } from '../../hooks/use-articles'
import { FilterControls } from './filter-controls'

interface DesktopFilterPanelProps {
  applied: FilterParams
  isLoggedIn: boolean
  onApplyFilters: (filters: FilterParams) => void
}

export function DesktopFilterPanel({
  applied,
  isLoggedIn,
  onApplyFilters,
}: DesktopFilterPanelProps) {
  const commitField = (patch: Partial<FilterParams>) => {
    onApplyFilters({ ...applied, ...patch })
    scrollToTop()
  }

  return (
    <div className='mb-4 rounded-lg border border-gray-300 bg-white/50 p-4'>
      <h2 className='mb-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-700'>
        <Funnel className='h-4 w-4 text-gray-600' />
        <span>絞り込み</span>
      </h2>
      <div className='flex items-start gap-4'>
        <FilterControls
          variant='desktop'
          filters={applied}
          isLoggedIn={isLoggedIn}
          onChange={commitField}
        />
      </div>
    </div>
  )
}
