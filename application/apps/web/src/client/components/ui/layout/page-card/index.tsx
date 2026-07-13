import type { PropsWithChildren } from 'react'
import PageContainer from '@/client/components/ui/layout/page-container'

type Props = PropsWithChildren<{
  title: string
}>

export default function PageCard({ title, children }: Props) {
  return (
    <PageContainer>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/50 p-6 shadow-xl backdrop-blur-sm'>
        <h1 className='text-xl font-semibold text-foreground'>{title}</h1>
        {children}
      </div>
    </PageContainer>
  )
}
