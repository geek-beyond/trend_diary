import { Button } from '@/client/components/shadcn/button'
import { cn } from '@/client/components/shadcn/lib/utils'

export interface ToggleOption<T> {
  value: T
  label: string
  dataSlot: string
}

export function ToggleButton({
  label,
  dataSlot,
  isSelected,
  onClick,
}: {
  label: string
  dataSlot: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Button
      type='button'
      variant='outline'
      aria-pressed={isSelected}
      className={cn(
        'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        isSelected &&
          'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900',
      )}
      onClick={onClick}
      data-slot={dataSlot}
    >
      {label}
    </Button>
  )
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
