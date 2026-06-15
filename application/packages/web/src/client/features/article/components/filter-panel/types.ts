import { type FilterParams } from '../../hooks/use-articles'

// index / desktop / mobile が同じ props を共有するため、循環参照を避けて単方向に依存できるよう型を切り出す
export interface FilterPanelProps {
  applied: FilterParams
  onApplyFilters: (filters: FilterParams) => void
  isLoggedIn: boolean
}
