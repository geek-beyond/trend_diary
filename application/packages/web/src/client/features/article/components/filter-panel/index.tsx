import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import { DesktopFilterPanel } from './desktop-filter-panel'
import { MobileFilterPanel } from './mobile-filter-panel'
import { type FilterPanelProps } from './types'

export function FilterPanel({ applied, onApplyFilters, isLoggedIn }: FilterPanelProps) {
  const isMobile = useIsMobile()

  return isMobile ? (
    <MobileFilterPanel applied={applied} isLoggedIn={isLoggedIn} onApplyFilters={onApplyFilters} />
  ) : (
    <DesktopFilterPanel applied={applied} isLoggedIn={isLoggedIn} onApplyFilters={onApplyFilters} />
  )
}
