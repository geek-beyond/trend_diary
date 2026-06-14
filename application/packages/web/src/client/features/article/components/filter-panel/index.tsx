import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import { type FilterParams } from '../../hooks/use-articles'
import { DesktopFilterPanel } from './desktop-filter-panel'
import { MobileFilterPanel } from './mobile-filter-panel'

interface FilterPanelProps {
  applied: FilterParams
  onApplyFilters: (filters: FilterParams) => void
  isLoggedIn: boolean
}

export function FilterPanel({ applied, onApplyFilters, isLoggedIn }: FilterPanelProps) {
  const isMobile = useIsMobile()

  return isMobile ? (
    <MobileFilterPanel applied={applied} isLoggedIn={isLoggedIn} onApplyFilters={onApplyFilters} />
  ) : (
    <DesktopFilterPanel applied={applied} isLoggedIn={isLoggedIn} onApplyFilters={onApplyFilters} />
  )
}
