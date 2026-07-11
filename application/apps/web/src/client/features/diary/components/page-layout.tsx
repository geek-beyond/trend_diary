import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  pageTitle: string
  dateResolveError: boolean
}>

export default function DiaryPageLayout({ pageTitle, dateResolveError, children }: Props) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-muted to-background p-6'>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur-sm'>
        <h1 className='text-xl font-semibold text-foreground'>{pageTitle}</h1>
        {dateResolveError && (
          <p className='mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'>
            JST日付の解決に失敗した。時間をおいて再読み込みして。
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
