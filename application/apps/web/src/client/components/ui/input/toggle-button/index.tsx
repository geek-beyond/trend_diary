import type { ReactNode } from 'react'
import { Button } from '@/client/components/shadcn/button'
import { cn } from '@/client/components/shadcn/lib/utils'

interface Props {
  label: string
  isSelected: boolean
  onClick: () => void
  icon?: ReactNode
}

export function ToggleButton({ label, isSelected, onClick, icon }: Props) {
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
    >
      {icon}
      {label}
    </Button>
  )
}
