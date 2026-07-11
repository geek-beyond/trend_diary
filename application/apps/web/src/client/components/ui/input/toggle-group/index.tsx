import { cn } from '@/client/components/shadcn/lib/utils'
import { ToggleButton } from '@/client/components/ui/input/toggle-button'

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
  className?: string
}

export function ToggleGroup<T>({
  options,
  selectedValue,
  onSelect,
  dataSlot,
  className,
}: Props<T>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      data-slot={dataSlot}
      role='group'
    >
      {options.map((option) => (
        <ToggleButton
          key={option.dataSlot}
          label={option.label}
          dataSlot={option.dataSlot}
          isSelected={selectedValue === option.value}
          onClick={() => onSelect(option.value)}
        />
      ))}
    </div>
  )
}
