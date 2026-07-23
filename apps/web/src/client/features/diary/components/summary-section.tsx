import { ARTICLE_MEDIA_LABELS } from '@trend-diary/domain/article/media'
import { toJstDate } from '@trend-diary/std/locale/date'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/client/components/shadcn/table'
import type { Source, Summary } from '@/client/features/diary/model/types'
import { toJaDateString } from '@/common/locale/date'

interface Props {
  sources: Source[]
  displaySummary: Summary
  targetDate?: string
}

export default function DiarySummarySection({ sources, displaySummary, targetDate }: Props) {
  return (
    <div className='mt-4'>
      <h2 className='text-sm font-semibold text-foreground'>集計</h2>
      {targetDate && (
        <p className='mt-1 text-sm text-muted-foreground' data-slot='diary-target-date'>
          対象日: {toJaDateString(toJstDate(targetDate))}
        </p>
      )}
      <div className='mt-2 rounded-lg border border-border bg-card p-3'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>媒体</TableHead>
              <TableHead className='text-right'>読了</TableHead>
              <TableHead className='text-right'>スキップ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.media}>
                <TableCell>{ARTICLE_MEDIA_LABELS[source.media]}</TableCell>
                <TableCell className='text-right'>{source.read}件</TableCell>
                <TableCell className='text-right'>{source.skip}件</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className='font-semibold'>合計</TableCell>
              <TableCell className='text-right font-semibold'>{displaySummary.read}件</TableCell>
              <TableCell className='text-right font-semibold'>{displaySummary.skip}件</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}
