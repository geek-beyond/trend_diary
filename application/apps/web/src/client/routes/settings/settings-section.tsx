import type { ReactNode } from 'react'
import { Badge } from '@/client/components/shadcn/badge'
import { cn } from '@/client/components/shadcn/lib/utils'

interface Props {
  title: string
  description: string
  // 未提供ならバッジを出さない。β版など補足ラベル用
  badge?: string
  // 先頭以外のセクションで区切り線を上に引く
  withDivider?: boolean
  children: ReactNode
}

export default function SettingsSection({
  title,
  description,
  badge,
  withDivider,
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
          {badge && <Badge variant='secondary'>{badge}</Badge>}
        </div>
        <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
      </div>
      {children}
    </section>
  )
}
