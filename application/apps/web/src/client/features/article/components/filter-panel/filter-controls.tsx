import { ToggleGroup, type ToggleOption } from '@/client/components/ui/input/toggle-group'
import {
  DATE_PRESETS,
  type DatePresetType,
  type FilterParams,
  type ReadStatusType,
} from '../../hooks/use-articles'
import MediaFilter from '../media-filter'
import { FilterField, type FilterVariant } from './filter-field'

const DATE_PRESET_LABEL_MAP: Record<DatePresetType, string> = {
  today: '今日',
  last3days: '過去3日',
  last7days: '過去7日',
}

const DATE_PRESET_OPTIONS: ToggleOption<DatePresetType>[] = DATE_PRESETS.map((preset) => ({
  value: preset,
  label: DATE_PRESET_LABEL_MAP[preset],
  dataSlot: `date-preset-filter-${preset}`,
}))

const READ_STATUS_OPTIONS: ToggleOption<ReadStatusType>[] = [
  { value: 'all', label: 'すべて', dataSlot: 'read-status-filter-all' },
  { value: 'unread', label: '未読のみ', dataSlot: 'read-status-filter-unread' },
]

interface FilterControlsProps {
  variant: FilterVariant
  filters: FilterParams
  isLoggedIn: boolean
  onChange: (patch: Partial<FilterParams>) => void
}

export function FilterControls({ variant, filters, isLoggedIn, onChange }: FilterControlsProps) {
  return (
    <>
      <FilterField label='媒体' variant={variant}>
        <MediaFilter selectedMedia={filters.media} onMediaChange={(media) => onChange({ media })} />
      </FilterField>
      <FilterField label='日付' variant={variant}>
        <ToggleGroup
          options={DATE_PRESET_OPTIONS}
          selectedValue={filters.datePreset}
          onSelect={(datePreset) => onChange({ datePreset })}
          dataSlot='date-preset-filter'
        />
      </FilterField>
      {isLoggedIn && (
        <FilterField label='既読状態' variant={variant}>
          <ToggleGroup
            options={READ_STATUS_OPTIONS}
            selectedValue={filters.readStatus}
            onSelect={(readStatus) => onChange({ readStatus })}
            dataSlot='read-status-filter'
          />
        </FilterField>
      )}
    </>
  )
}
