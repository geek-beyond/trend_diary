import { Funnel } from 'lucide-react'
import { type FilterParams } from '../../hooks/use-articles'
import { FilterControls } from './filter-controls'

interface DesktopFilterPanelProps {
  draft: FilterParams
  isLoggedIn: boolean
  onCommit: (patch: Partial<FilterParams>) => void
}

export function DesktopFilterPanel({ draft, isLoggedIn, onCommit }: DesktopFilterPanelProps) {
  return (
    <div className='mb-4 rounded-lg border border-gray-300 bg-white/50 p-4'>
      <h2 className='mb-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-700'>
        <Funnel className='h-4 w-4 text-gray-600' />
        <span>絞り込み</span>
      </h2>
      <div className='flex items-start gap-4'>
        <FilterControls
          variant='desktop'
          filters={draft}
          isLoggedIn={isLoggedIn}
          onChange={onCommit}
        />
      </div>
    </div>
  )
}
