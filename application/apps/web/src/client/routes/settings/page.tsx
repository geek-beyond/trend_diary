import { Badge } from '@/client/components/shadcn/badge'
import PageCard from '@/client/components/ui/layout/page-card'
import { PasskeyToggle } from '@/client/features/passkey'
import { ThemeToggle } from '@/client/features/theme'

export default function SettingsPage() {
  const pageTitle = '設定'

  return (
    <PageCard title={pageTitle}>
      <section className='mt-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
        <div>
          <h2 className='text-sm font-semibold text-foreground'>テーマ</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            画面の配色を選べます。「システム」はお使いの端末の設定に追従します。
          </p>
        </div>
        <ThemeToggle />
      </section>

      <section className='mt-6 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
        <div>
          <div className='flex items-center gap-2'>
            <h2 className='text-sm font-semibold text-foreground'>パスキー</h2>
            <Badge variant='secondary'>β版</Badge>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>
            パスキーを有効にすると、次回から生体認証やデバイスのロックだけでログインできます。
          </p>
        </div>
        <PasskeyToggle />
      </section>
    </PageCard>
  )
}
