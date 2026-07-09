import { RotateCcw } from 'lucide-react'
import { Button } from '@/client/components/shadcn/button'

interface Props {
  message?: string
  onRetry: () => void
}

export default function FetchErrorState({
  message = 'エラーが発生しました。時間をおいて再度お試しください。',
  onRetry,
}: Props) {
  return (
    <div
      role='alert'
      data-slot='fetch-error-state'
      className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
    >
      <p>{message}</p>
      <Button type='button' variant='outline' size='sm' className='mt-2' onClick={onRetry}>
        <RotateCcw />
        再試行
      </Button>
    </div>
  )
}
