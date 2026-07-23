import { ChevronDown, Funnel } from 'lucide-react'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Button } from '@/client/components/shadcn/button'
import { scrollToTop } from '@/client/lib/scroll'
import { ALL_MEDIA, type FilterParams, isAllMediaSelected } from '../../hooks/use-articles'
import { FilterControls } from './filter-controls'
import { type FilterPanelProps } from './types'

const DEFAULT_FILTERS: FilterParams = { media: ALL_MEDIA, readStatus: 'all', datePreset: 'today' }

export function MobileFilterPanel({ applied, isLoggedIn, onApplyFilters }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<FilterParams>(applied)

  const appliedFilterCount = [
    !isAllMediaSelected(applied.media),
    isLoggedIn && applied.readStatus === 'unread',
    applied.datePreset !== 'today',
  ].filter(Boolean).length

  const editDraft = (patch: Partial<FilterParams>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }

  const commit = (filters: FilterParams) => {
    onApplyFilters(filters)
    setIsOpen(false)
    scrollToTop()
  }

  const resetDraft = () => {
    setDraft(applied)
  }

  const openPanel = () => {
    resetDraft()
    setIsOpen(true)
  }

  const closePanel = () => {
    resetDraft()
    setIsOpen(false)
  }

  return (
    <div className='mb-4 rounded-lg border border-border bg-card/50 p-4'>
      <button
        type='button'
        className='flex w-full items-center justify-between'
        onClick={isOpen ? closePanel : openPanel}
        data-slot='mobile-filter-trigger'
      >
        <span className='inline-flex items-center gap-2'>
          <Funnel className='h-4 w-4 text-muted-foreground' />
          <span className='text-sm font-semibold text-foreground'>絞り込み</span>
          {appliedFilterCount > 0 && (
            <span
              className='rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700'
              data-slot='mobile-filter-applied-count'
            >
              {appliedFilterCount}件適用中
            </span>
          )}
        </span>
        <ChevronDown
          className={twMerge(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen ? 'rotate-180' : '',
          )}
        />
      </button>
      {isOpen && (
        <div className='mt-4 space-y-4' data-slot='mobile-filter-panel'>
          <FilterControls
            variant='mobile'
            filters={draft}
            isLoggedIn={isLoggedIn}
            onChange={editDraft}
          />
          <div className='flex items-center justify-end gap-2 pt-2'>
            <Button
              type='button'
              variant='ghost'
              onClick={closePanel}
              data-slot='mobile-filter-cancel'
            >
              キャンセル
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => commit(DEFAULT_FILTERS)}
              data-slot='mobile-filter-clear'
            >
              クリア
            </Button>
            <Button type='button' onClick={() => commit(draft)} data-slot='mobile-filter-apply'>
              適用
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
