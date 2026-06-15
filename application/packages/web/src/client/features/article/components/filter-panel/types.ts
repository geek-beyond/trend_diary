import { type FilterParams } from '../../hooks/use-articles'

// 子が index を import すると循環参照になるため、共有 props 型はここに置く
export interface FilterPanelProps {
  applied: FilterParams
  onApplyFilters: (filters: FilterParams) => void
  isLoggedIn: boolean
}
