import { Badge } from '@/client/components/shadcn/badge'
import PageCard from '@/client/components/ui/layout/page-card'
import { PasskeyToggle } from '@/client/features/passkey'
import { SettingsSection } from '@/client/features/settings'
import { ThemeToggle } from '@/client/features/theme'

export default function SettingsPage() {
  const pageTitle = '設定'

  return (
    <PageCard title={pageTitle}>
      <SettingsSection
        title='テーマ'
        description='画面の配色を選べます。「システム」はお使いの端末の設定に追従します。'
      >
        <ThemeToggle />
      </SettingsSection>

      <SettingsSection
        title='パスキー'
        description='パスキーを有効にすると、次回から生体認証やデバイスのロックだけでログインできます。'
        badge={<Badge variant='secondary'>β版</Badge>}
        withDivider
      >
        <PasskeyToggle />
      </SettingsSection>
    </PageCard>
  )
}
