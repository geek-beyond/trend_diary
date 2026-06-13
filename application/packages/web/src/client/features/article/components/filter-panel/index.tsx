import { useState } from 'react'
import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import { scrollToTop } from '@/client/lib/scroll'
import { type DatePresetType, type FilterParams } from '../../hooks/use-articles'
import { type MediaType } from '../media-filter'
import { type ReadStatusType } from '../read-status-filter'
import { DesktopFilterPanel } from './desktop-filter-panel'
import { MobileFilterPanel } from './mobile-filter-panel'

const DEFAULT_FILTERS: FilterParams = { media: null, readStatus: 'all', datePreset: 'today' }

interface FilterPanelProps {
  selectedMedia: MediaType
  selectedReadStatus: ReadStatusType
  selectedDatePreset: DatePresetType
  onApplyFilters: (filters: FilterParams) => void
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
  const applied: FilterParams = {
    media: selectedMedia,
    readStatus: selectedReadStatus,
    datePreset: selectedDatePreset,
  }
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [draft, setDraft] = useState<FilterParams>(applied)

  const appliedFilterCount =
    (applied.media ? 1 : 0) +
    (isLoggedIn && applied.readStatus === 'unread' ? 1 : 0) +
    (applied.datePreset !== 'today' ? 1 : 0)

  const commitFilters = (filters: FilterParams) => {
    onApplyFilters(filters)
    setIsFilterOpen(false)
    scrollToTop()
  }

  const editDraft = (patch: Partial<FilterParams>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }

  const commitDraft = (patch: Partial<FilterParams>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    commitFilters(next)
  }

  const toggleFilter = () => {
    if (isFilterOpen) {
      setIsFilterOpen(false)
      return
    }
    setDraft(applied)
    setIsFilterOpen(true)
  }

  const cancelFilter = () => {
    setDraft(applied)
    setIsFilterOpen(false)
  }

  if (isMobile) {
    return (
      <MobileFilterPanel
        isOpen={isFilterOpen}
        appliedFilterCount={appliedFilterCount}
        draft={draft}
        isLoggedIn={isLoggedIn}
        onToggle={toggleFilter}
        onDraftChange={editDraft}
        onCancel={cancelFilter}
        onClear={() => commitDraft(DEFAULT_FILTERS)}
        onApply={() => commitFilters(draft)}
      />
    )
  }

  return <DesktopFilterPanel draft={draft} isLoggedIn={isLoggedIn} onCommit={commitDraft} />
}
