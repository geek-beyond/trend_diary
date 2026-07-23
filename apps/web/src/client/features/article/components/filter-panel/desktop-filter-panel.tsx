import { Funnel } from 'lucide-react'
import { scrollToTop } from '@/client/lib/scroll'
import { type FilterParams } from '../../hooks/use-articles'
import { FilterControls } from './filter-controls'
import { type FilterPanelProps } from './types'

export function DesktopFilterPanel({ applied, isLoggedIn, onApplyFilters }: FilterPanelProps) {
  const commitField = (patch: Partial<FilterParams>) => {
    onApplyFilters({ ...applied, ...patch })
    scrollToTop()
  }

  return (
    <div className='mb-4 rounded-lg border border-border bg-card/50 p-4'>
      <h2 className='mb-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground'>
        <Funnel className='h-4 w-4 text-muted-foreground' />
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
