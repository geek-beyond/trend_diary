import { type DatePresetType } from '../../hooks/use-articles'
import { type MediaType } from '../media-filter'
import { type ReadStatusType } from '../read-status-filter'

export interface Filters {
  media: MediaType
  readStatus: ReadStatusType
  datePreset: DatePresetType
}
