import { type FilterParams } from '../../hooks/use-articles'

// 型を index に置くと子からの import が循環参照になるため
export interface FilterPanelProps {
  applied: FilterParams
  onApplyFilters: (filters: FilterParams) => void
  isLoggedIn: boolean
}
