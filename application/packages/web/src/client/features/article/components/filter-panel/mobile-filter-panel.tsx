import { ChevronDown, Funnel } from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { Button } from '@/client/components/shadcn/button'
import { type FilterParams } from '../../hooks/use-articles'
import { FilterControls } from './filter-controls'

interface MobileFilterPanelProps {
  isOpen: boolean
  appliedFilterCount: number
  draft: FilterParams
  isLoggedIn: boolean
  onToggle: () => void
  onDraftChange: (patch: Partial<FilterParams>) => void
  onCancel: () => void
  onClear: () => void
  onApply: () => void
}

export function MobileFilterPanel({
  isOpen,
  appliedFilterCount,
  draft,
  isLoggedIn,
  onToggle,
  onDraftChange,
  onCancel,
  onClear,
  onApply,
}: MobileFilterPanelProps) {
  return (
    <div className='mb-4 rounded-lg border border-gray-300 bg-white/50 p-4'>
      <button
        type='button'
        className='flex w-full items-center justify-between'
        onClick={onToggle}
        data-slot='mobile-filter-trigger'
      >
        <span className='inline-flex items-center gap-2'>
          <Funnel className='h-4 w-4 text-gray-600' />
          <span className='text-sm font-semibold text-gray-700'>絞り込み</span>
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
            'h-4 w-4 text-gray-600 transition-transform',
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
            onChange={onDraftChange}
          />
          <div className='flex items-center justify-end gap-2 pt-2'>
            <Button
              type='button'
              variant='ghost'
              onClick={onCancel}
              data-slot='mobile-filter-cancel'
            >
              キャンセル
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={onClear}
              data-slot='mobile-filter-clear'
            >
              クリア
            </Button>
            <Button type='button' onClick={onApply} data-slot='mobile-filter-apply'>
              適用
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
