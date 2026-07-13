import type { PropsWithChildren, ReactNode } from 'react'
import { cn } from '@/client/components/shadcn/lib/utils'

type Props = PropsWithChildren<{
  title: string
  description: string
  badge?: ReactNode
  withDivider?: boolean
}>

export default function SettingsSection({
  title,
  description,
  badge,
  withDivider = false,
  children,
}: Props) {
  return (
    <section
      className={cn(
        'mt-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        withDivider && 'border-t border-border pt-6',
      )}
    >
      <div>
        <div className='flex items-center gap-2'>
          <h2 className='text-sm font-semibold text-foreground'>{title}</h2>
          {badge}
        </div>
        <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
      </div>
      {children}
    </section>
  )
}
