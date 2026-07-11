import type { ReactNode } from 'react'
import { cn } from '@/client/components/shadcn/lib/utils'
import { ToggleButton } from '@/client/components/ui/input/toggle-button'

export interface ToggleOption<T> {
  value: T
  label: string
  icon?: ReactNode
}

interface Props<T> {
  options: readonly ToggleOption<T>[]
  selectedValue: T
  onSelect: (value: T) => void
  className?: string
}

export function ToggleGroup<T>({ options, selectedValue, onSelect, className }: Props<T>) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} role='group'>
      {options.map((option) => (
        <ToggleButton
          key={String(option.value)}
          label={option.label}
          icon={option.icon}
          isSelected={selectedValue === option.value}
          onClick={() => onSelect(option.value)}
        />
      ))}
    </div>
  )
}
