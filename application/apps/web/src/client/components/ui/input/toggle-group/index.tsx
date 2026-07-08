import { Button } from '@/client/components/shadcn/button'
import { cn } from '@/client/components/shadcn/lib/utils'

export interface ToggleOption<T> {
  value: T
  label: string
  dataSlot: string
}

interface Props<T> {
  options: readonly ToggleOption<T>[]
  selectedValue: T
  onSelect: (value: T) => void
  dataSlot: string
}

export function ToggleGroup<T>({ options, selectedValue, onSelect, dataSlot }: Props<T>) {
  return (
    <div className='flex flex-wrap items-center gap-2' data-slot={dataSlot}>
      {options.map((option) => {
        const isSelected = selectedValue === option.value
        return (
          <Button
            key={option.dataSlot}
            type='button'
            variant='outline'
            className={cn(
              'border-gray-300 text-gray-700 hover:bg-gray-100',
              isSelected && 'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100',
            )}
            onClick={() => onSelect(option.value)}
            data-slot={option.dataSlot}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
