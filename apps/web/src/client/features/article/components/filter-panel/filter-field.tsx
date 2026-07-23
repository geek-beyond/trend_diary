import { type ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export type FilterVariant = 'mobile' | 'desktop'

export function FilterField({
  label,
  variant,
  children,
}: {
  label: string
  variant: FilterVariant
  children: ReactNode
}) {
  const isMobile = variant === 'mobile'
  return (
    <div className={isMobile ? 'flex w-full flex-col items-start gap-2' : 'flex flex-col gap-1'}>
      <span
        className={twMerge('font-medium text-muted-foreground', isMobile ? 'text-sm' : 'text-xs')}
      >
        {label}
      </span>
      {children}
    </div>
  )
}
