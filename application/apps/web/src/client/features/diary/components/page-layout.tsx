import type { PropsWithChildren } from 'react'
import PageCard from '@/client/components/ui/layout/page-card'

type Props = PropsWithChildren<{
  pageTitle: string
  dateResolveError: boolean
}>

export default function DiaryPageLayout({ pageTitle, dateResolveError, children }: Props) {
  return (
    <PageCard title={pageTitle}>
      {dateResolveError && (
        <p className='mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
          JST日付の解決に失敗しました。時間をおいて再読み込みしてください。
        </p>
      )}
      {children}
    </PageCard>
  )
}
