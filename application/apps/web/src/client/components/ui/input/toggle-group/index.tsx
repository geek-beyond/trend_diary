import type { ReactNode } from 'react'
import { Button } from '@/client/components/shadcn/button'
import { cn } from '@/client/components/shadcn/lib/utils'

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
      {options.map((option) => {
        const isSelected = selectedValue === option.value
        return (
          <Button
            key={String(option.value)}
            type='button'
            variant='outline'
            aria-pressed={isSelected}
            className={cn(
              'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              isSelected &&
                'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900',
            )}
            onClick={() => onSelect(option.value)}
          >
            {option.icon}
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
