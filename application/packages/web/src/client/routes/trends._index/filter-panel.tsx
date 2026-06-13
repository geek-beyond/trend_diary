import { ChevronDown, Funnel } from 'lucide-react'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Button } from '@/client/components/shadcn/button'
import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import {
  DatePresetFilter,
  type DatePresetType,
  MediaFilter,
  type MediaType,
  ReadStatusFilter,
  type ReadStatusType,
} from '@/client/features/article'

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

interface FilterPanelProps {
  selectedMedia: MediaType
  selectedReadStatus: ReadStatusType
  selectedDatePreset: DatePresetType
  onApplyFilters: (filters: {
    media: MediaType
    readStatus: ReadStatusType
    datePreset: DatePresetType
  }) => void
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
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [draftMedia, setDraftMedia] = useState<MediaType>(selectedMedia)
  const [draftReadStatus, setDraftReadStatus] = useState<ReadStatusType>(selectedReadStatus)
  const [draftDatePreset, setDraftDatePreset] = useState<DatePresetType>(selectedDatePreset)

  const appliedFilterCount =
    (selectedMedia ? 1 : 0) +
    (isLoggedIn && selectedReadStatus === 'unread' ? 1 : 0) +
    (selectedDatePreset !== 'today' ? 1 : 0)

  const handleToggleFilter = () => {
    if (!isFilterOpen) {
      setDraftMedia(selectedMedia)
      setDraftReadStatus(selectedReadStatus)
      setDraftDatePreset(selectedDatePreset)
    }
    setIsFilterOpen(!isFilterOpen)
  }

  const handleCancelFilter = () => {
    setDraftMedia(selectedMedia)
    setDraftReadStatus(selectedReadStatus)
    setDraftDatePreset(selectedDatePreset)
    setIsFilterOpen(false)
  }

  const handleClearFilter = () => {
    setDraftMedia(null)
    setDraftReadStatus('all')
    setDraftDatePreset('today')
    onApplyFilters({ media: null, readStatus: 'all', datePreset: 'today' })
    if (isMobile) {
      setIsFilterOpen(false)
    }
    scrollToTop()
  }

  const handleApplyFilter = () => {
    onApplyFilters({ media: draftMedia, readStatus: draftReadStatus, datePreset: draftDatePreset })
    if (isMobile) {
      setIsFilterOpen(false)
    }
    scrollToTop()
  }

  const handleDesktopMediaChange = (media: MediaType) => {
    setDraftMedia(media)
    onApplyFilters({ media, readStatus: draftReadStatus, datePreset: draftDatePreset })
    scrollToTop()
  }

  const handleDesktopReadStatusChange = (readStatus: ReadStatusType) => {
    setDraftReadStatus(readStatus)
    onApplyFilters({ media: draftMedia, readStatus, datePreset: draftDatePreset })
    scrollToTop()
  }

  const handleDesktopDatePresetChange = (datePreset: DatePresetType) => {
    setDraftDatePreset(datePreset)
    onApplyFilters({ media: draftMedia, readStatus: draftReadStatus, datePreset })
    scrollToTop()
  }

  if (isMobile) {
    return (
      <div className='mb-4 rounded-lg border border-gray-300 bg-white/50 p-4'>
        <button
          type='button'
          className='flex w-full items-center justify-between'
          onClick={handleToggleFilter}
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
            <div className='flex w-full flex-col items-start gap-2'>
              <span className='text-sm font-medium text-gray-600'>媒体</span>
              <MediaFilter selectedMedia={draftMedia} onMediaChange={setDraftMedia} />
            </div>
            <div className='flex w-full flex-col items-start gap-2'>
              <span className='text-sm font-medium text-gray-600'>日付</span>
              <DatePresetFilter
                selectedDatePreset={draftDatePreset}
                onDatePresetChange={setDraftDatePreset}
              />
            </div>
            {isLoggedIn && (
              <div className='flex w-full flex-col items-start gap-2'>
                <span className='text-sm font-medium text-gray-600'>既読状態</span>
                <ReadStatusFilter
                  selectedReadStatus={draftReadStatus}
                  onReadStatusChange={setDraftReadStatus}
                />
              </div>
            )}
            <div className='flex items-center justify-end gap-2 pt-2'>
              <Button
                type='button'
                variant='ghost'
                onClick={handleCancelFilter}
                data-slot='mobile-filter-cancel'
              >
                キャンセル
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={handleClearFilter}
                data-slot='mobile-filter-clear'
              >
                クリア
              </Button>
              <Button type='button' onClick={handleApplyFilter} data-slot='mobile-filter-apply'>
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
      <div className='space-y-3'>
        <div className='flex items-start gap-4'>
          <div className='flex flex-col gap-1'>
            <span className='text-xs font-medium text-gray-600'>媒体</span>
            <MediaFilter selectedMedia={draftMedia} onMediaChange={handleDesktopMediaChange} />
          </div>
          <div className='flex flex-col gap-1'>
            <span className='text-xs font-medium text-gray-600'>日付</span>
            <DatePresetFilter
              selectedDatePreset={draftDatePreset}
              onDatePresetChange={handleDesktopDatePresetChange}
            />
          </div>
          {isLoggedIn && (
            <div className='flex flex-col gap-1'>
              <span className='text-xs font-medium text-gray-600'>既読状態</span>
              <ReadStatusFilter
                selectedReadStatus={draftReadStatus}
                onReadStatusChange={handleDesktopReadStatusChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
