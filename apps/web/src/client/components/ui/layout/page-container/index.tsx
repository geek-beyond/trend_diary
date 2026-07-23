import type { PropsWithChildren } from 'react'
import { cn } from '@/client/components/shadcn/lib/utils'

type Props = PropsWithChildren<{
  className?: string
}>

// app-layout（ヘッダーあり）配下では min-h-screen だとヘッダー(h-16)分ページが viewport を
// はみ出し不要なスクロールが出るため、残り高さを埋める flex-1 をこの共通ラッパーに集約する
// スクリーンリーダーがページ本文へ直接移動できるよう、本文の外枠を main ランドマークにする
export default function PageContainer({ className, children }: Props) {
  return (
    <main className={cn('flex-1 bg-gradient-to-br from-muted to-background p-6', className)}>
      {children}
    </main>
  )
}
