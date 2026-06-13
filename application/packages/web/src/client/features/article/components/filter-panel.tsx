import { ChevronDown, Funnel } from 'lucide-react'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Button } from '@/client/components/shadcn/button'
import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import { scrollToTop } from '@/client/lib/scroll'
import { type DatePresetType } from '../hooks/use-articles'
import DatePresetFilter from './date-preset-filter'
import { FilterField } from './filter-field'
import MediaFilter, { type MediaType } from './media-filter'
import ReadStatusFilter, { type ReadStatusType } from './read-status-filter'

interface Filters {
  media: MediaType
  readStatus: ReadStatusType
  datePreset: DatePresetType
}

const DEFAULT_FILTERS: Filters = { media: null, readStatus: 'all', datePreset: 'today' }

interface FilterPanelProps {
  selectedMedia: MediaType
  selectedReadStatus: ReadStatusType
  selectedDatePreset: DatePresetType
  onApplyFilters: (filters: Filters) => void
  isLoggedIn: boolean
}

export function FilterPanel({
  selectedMedia,
  selectedReadStatus,
  selectedDatePreset,
  onApplyFilters,
  isLoggedIn,
}: FilterPanelProps) {
  const isMobile = useIsMobile()
  const applied: Filters = {
    media: selectedMedia,
    readStatus: selectedReadStatus,
    datePreset: selectedDatePreset,
  }
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [draft, setDraft] = useState<Filters>(applied)

  const appliedFilterCount =
    (applied.media ? 1 : 0) +
    (isLoggedIn && applied.readStatus === 'unread' ? 1 : 0) +
    (applied.datePreset !== 'today' ? 1 : 0)

  const commitFilters = (filters: Filters) => {
    onApplyFilters(filters)
    if (isMobile) {
      setIsFilterOpen(false)
    }
    scrollToTop()
  }

  const editDraft = (patch: Partial<Filters>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }

  const commitDraft = (patch: Partial<Filters>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    commitFilters(next)
  }

  const openFilter = () => {
    setDraft(applied)
    setIsFilterOpen(true)
  }

  const closeFilter = () => {
    setDraft(applied)
    setIsFilterOpen(false)
  }

  const applyDraft = () => commitFilters(draft)
  const clearFilter = () => commitDraft(DEFAULT_FILTERS)

  if (isMobile) {
    return (
      <div className='mb-4 rounded-lg border border-gray-300 bg-white/50 p-4'>
        <button
          type='button'
          className='flex w-full items-center justify-between'
          onClick={isFilterOpen ? closeFilter : openFilter}
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
              isFilterOpen ? 'rotate-180' : '',
            )}
          />
        </button>
        {isFilterOpen && (
          <div className='mt-4 space-y-4' data-slot='mobile-filter-panel'>
            <FilterField label='媒体' variant='mobile'>
              <MediaFilter
                selectedMedia={draft.media}
                onMediaChange={(media) => editDraft({ media })}
              />
            </FilterField>
            <FilterField label='日付' variant='mobile'>
              <DatePresetFilter
                selectedDatePreset={draft.datePreset}
                onDatePresetChange={(datePreset) => editDraft({ datePreset })}
              />
            </FilterField>
            {isLoggedIn && (
              <FilterField label='既読状態' variant='mobile'>
                <ReadStatusFilter
                  selectedReadStatus={draft.readStatus}
                  onReadStatusChange={(readStatus) => editDraft({ readStatus })}
                />
              </FilterField>
            )}
            <div className='flex items-center justify-end gap-2 pt-2'>
              <Button
                type='button'
                variant='ghost'
                onClick={closeFilter}
                data-slot='mobile-filter-cancel'
              >
                キャンセル
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={clearFilter}
                data-slot='mobile-filter-clear'
              >
                クリア
              </Button>
              <Button type='button' onClick={applyDraft} data-slot='mobile-filter-apply'>
                適用
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='mb-4 rounded-lg border border-gray-300 bg-white/50 p-4'>
      <h2 className='mb-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-700'>
        <Funnel className='h-4 w-4 text-gray-600' />
        <span>絞り込み</span>
      </h2>
      <div className='flex items-start gap-4'>
        <FilterField label='媒体' variant='desktop'>
          <MediaFilter
            selectedMedia={draft.media}
            onMediaChange={(media) => commitDraft({ media })}
          />
        </FilterField>
        <FilterField label='日付' variant='desktop'>
          <DatePresetFilter
            selectedDatePreset={draft.datePreset}
            onDatePresetChange={(datePreset) => commitDraft({ datePreset })}
          />
        </FilterField>
        {isLoggedIn && (
          <FilterField label='既読状態' variant='desktop'>
            <ReadStatusFilter
              selectedReadStatus={draft.readStatus}
              onReadStatusChange={(readStatus) => commitDraft({ readStatus })}
            />
          </FilterField>
        )}
      </div>
    </div>
  )
}
