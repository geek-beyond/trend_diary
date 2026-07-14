import PageCard from '@/client/components/ui/layout/page-card'
import { GithubLinkToggle } from '@/client/features/github-auth'
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
        badge={{ label: 'β版', variant: 'secondary' }}
        withDivider
      >
        <PasskeyToggle />
      </SettingsSection>

      <SettingsSection
        title='GitHub連携'
        description='GitHubアカウントを連携すると、次回からGitHubでログインできます。'
        withDivider
      >
        <GithubLinkToggle />
      </SettingsSection>
    </PageCard>
  )
}
