type Props = {
  pageTitle: string
}

export default function DiaryLoginRequired({ pageTitle }: Props) {
  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-gray-900'>{pageTitle}</h1>
      <p className='mt-4 text-sm text-gray-600'>この機能はログイン時のみ利用できます。</p>
    </div>
  )
}
