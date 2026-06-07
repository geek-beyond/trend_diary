import { Button } from '@/client/components/shadcn/button'
import { cn } from '@/client/components/shadcn/lib/utils'

export type ReadStatusType = 'all' | 'unread'

type Props = {
  selectedReadStatus: ReadStatusType
  onReadStatusChange: (readStatus: ReadStatusType) => void
}

const readStatusOptions = [
  { value: 'all', label: 'すべて', dataSlot: 'read-status-filter-all' },
  { value: 'unread', label: '未読のみ', dataSlot: 'read-status-filter-unread' },
] as const

export default function ReadStatusFilter({ selectedReadStatus, onReadStatusChange }: Props) {
  return (
    <div className='flex flex-wrap items-center gap-2' data-slot='read-status-filter'>
      {readStatusOptions.map((option) => {
        const isSelected = selectedReadStatus === option.value
        return (
          <Button
            key={option.value}
            type='button'
            variant='outline'
            className={cn(
              'border-gray-300 text-gray-700 hover:bg-gray-100',
              isSelected && 'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100',
            )}
            onClick={() => onReadStatusChange(option.value)}
            data-slot={option.dataSlot}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
