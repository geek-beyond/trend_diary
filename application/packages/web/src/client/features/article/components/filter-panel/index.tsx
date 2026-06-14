import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import { type DatePresetType, type FilterParams } from '../../hooks/use-articles'
import { type MediaType } from '../media-filter'
import { type ReadStatusType } from '../read-status-filter'
import { DesktopFilterPanel } from './desktop-filter-panel'
import { MobileFilterPanel } from './mobile-filter-panel'

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

  return isMobile ? (
    <MobileFilterPanel applied={applied} isLoggedIn={isLoggedIn} onApplyFilters={onApplyFilters} />
  ) : (
    <DesktopFilterPanel applied={applied} isLoggedIn={isLoggedIn} onApplyFilters={onApplyFilters} />
  )
}
