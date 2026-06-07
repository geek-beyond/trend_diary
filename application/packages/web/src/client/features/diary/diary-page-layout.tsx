import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  pageTitle: string
  dateResolveError: boolean
}>

export default function DiaryPageLayout({ pageTitle, dateResolveError, children }: Props) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6'>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-white/40 bg-white/60 p-6 shadow-xl backdrop-blur-sm'>
        <h1 className='text-xl font-semibold text-gray-900'>{pageTitle}</h1>
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
