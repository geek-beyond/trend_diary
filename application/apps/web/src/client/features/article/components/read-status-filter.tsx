import { ToggleGroup, type ToggleOption } from '@/client/components/ui/input/toggle-group'

export type ReadStatusType = 'all' | 'unread'

interface Props {
  selectedReadStatus: ReadStatusType
  onReadStatusChange: (readStatus: ReadStatusType) => void
}

const readStatusOptions: ToggleOption<ReadStatusType>[] = [
  { value: 'all', label: 'すべて', dataSlot: 'read-status-filter-all' },
  { value: 'unread', label: '未読のみ', dataSlot: 'read-status-filter-unread' },
]

export default function ReadStatusFilter({ selectedReadStatus, onReadStatusChange }: Props) {
  return (
    <ToggleGroup
      options={readStatusOptions}
      selectedValue={selectedReadStatus}
      onSelect={onReadStatusChange}
      dataSlot='read-status-filter'
    />
  )
}
