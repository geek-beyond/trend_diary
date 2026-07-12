import type { ReactNode } from 'react'
import { Badge } from '@/client/components/shadcn/badge'
import { cn } from '@/client/components/shadcn/lib/utils'

interface Props {
  title: string
  description: string
  badgeLabel?: string
  withTopDivider?: boolean
  children: ReactNode
}

export default function SettingsSection({
  title,
  description,
  badgeLabel,
  withTopDivider,
  children,
}: Props) {
  return (
    <section
      className={cn(
        'mt-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        withTopDivider && 'border-t border-border pt-6',
      )}
    >
      <div>
        <div className='flex items-center gap-2'>
          <h2 className='text-sm font-semibold text-foreground'>{title}</h2>
          {badgeLabel && <Badge variant='secondary'>{badgeLabel}</Badge>}
        </div>
        <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
      </div>
      {children}
    </section>
  )
}
