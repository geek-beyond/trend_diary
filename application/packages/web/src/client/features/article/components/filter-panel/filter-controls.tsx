import DatePresetFilter from '../date-preset-filter'
import MediaFilter from '../media-filter'
import ReadStatusFilter from '../read-status-filter'
import { FilterField } from './filter-field'
import { type Filters } from './types'

interface FilterControlsProps {
  variant: 'mobile' | 'desktop'
  filters: Filters
  isLoggedIn: boolean
  onChange: (patch: Partial<Filters>) => void
}

export function FilterControls({ variant, filters, isLoggedIn, onChange }: FilterControlsProps) {
  return (
    <>
      <FilterField label='媒体' variant={variant}>
        <MediaFilter selectedMedia={filters.media} onMediaChange={(media) => onChange({ media })} />
      </FilterField>
      <FilterField label='日付' variant={variant}>
        <DatePresetFilter
          selectedDatePreset={filters.datePreset}
          onDatePresetChange={(datePreset) => onChange({ datePreset })}
        />
      </FilterField>
      {isLoggedIn && (
        <FilterField label='既読状態' variant={variant}>
          <ReadStatusFilter
            selectedReadStatus={filters.readStatus}
            onReadStatusChange={(readStatus) => onChange({ readStatus })}
          />
        </FilterField>
      )}
    </>
  )
}
