import { ToggleGroup, type ToggleOption } from '@/client/components/ui/input/toggle-group'
import { DATE_PRESETS, type DatePresetType } from '@/client/features/article/hooks/use-articles'

interface Props {
  selectedDatePreset: DatePresetType
  onDatePresetChange: (datePreset: DatePresetType) => void
}

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

export default function DatePresetFilter({ selectedDatePreset, onDatePresetChange }: Props) {
  return (
    <ToggleGroup
      options={DATE_PRESET_OPTIONS}
      selectedValue={selectedDatePreset}
      onSelect={onDatePresetChange}
      dataSlot='date-preset-filter'
    />
  )
}
