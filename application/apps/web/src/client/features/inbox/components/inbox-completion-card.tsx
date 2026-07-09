import { CheckCircle2 } from 'lucide-react'
import { AnchorLink } from '@/client/components/ui/navigation/link'

export default function InboxCompletionCard() {
  return (
    <section
      data-slot='inbox-completion-card'
      className='animate-in fade-in zoom-in-95 mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-900 duration-700'
    >
      <span className='inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold'>
        消化完了
      </span>
      <div className='mt-3 flex items-center gap-2'>
        <CheckCircle2 className='h-5 w-5 shrink-0' />
        <p className='text-sm leading-relaxed text-emerald-800'>
          いいペース。次の更新までこのペースをキープしよう。
        </p>
      </div>
      <AnchorLink
        to='/trends'
        className='mt-3 inline-block text-sm text-emerald-900 underline hover:text-emerald-950'
      >
        トレンド一覧へ
      </AnchorLink>
    </section>
  )
}
