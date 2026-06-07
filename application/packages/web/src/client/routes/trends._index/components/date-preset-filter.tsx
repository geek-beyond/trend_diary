import { Button } from '@/client/components/shadcn/button'
import { cn } from '@/client/components/shadcn/lib/utils'
import { DATE_PRESETS, type DatePresetType } from '../hooks/use-articles'

type Props = {
  selectedDatePreset: DatePresetType
  onDatePresetChange: (datePreset: DatePresetType) => void
}

const DATE_PRESET_LABEL_MAP: Record<DatePresetType, string> = {
  today: '今日',
  last3days: '過去3日',
  last7days: '過去7日',
}

const DATE_PRESET_OPTIONS = DATE_PRESETS.map((preset) => ({
  value: preset,
  label: DATE_PRESET_LABEL_MAP[preset],
  dataSlot: `date-preset-filter-${preset}`,
}))

export default function DatePresetFilter({ selectedDatePreset, onDatePresetChange }: Props) {
  return (
    <div className='flex flex-wrap items-center gap-2' data-slot='date-preset-filter'>
      {DATE_PRESET_OPTIONS.map((option) => {
        const isSelected = selectedDatePreset === option.value
        return (
          <Button
            key={option.dataSlot}
            type='button'
            variant='outline'
            className={cn(
              'border-gray-300 text-gray-700 hover:bg-gray-100',
              isSelected && 'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100',
            )}
            onClick={() => onDatePresetChange(option.value)}
            data-slot={option.dataSlot}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
