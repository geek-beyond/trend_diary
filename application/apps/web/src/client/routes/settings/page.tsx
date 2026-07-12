import { GithubLinkToggle } from '@/client/features/github-auth'
import { PasskeyToggle } from '@/client/features/passkey'
import { ThemeToggle } from '@/client/features/theme'
import SettingsSection from './settings-section'

export default function SettingsPage() {
  const pageTitle = '設定'

  return (
    <div className='min-h-screen bg-gradient-to-br from-muted to-background p-6'>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/50 p-6 shadow-xl backdrop-blur-sm'>
        <h1 className='text-xl font-semibold text-foreground'>{pageTitle}</h1>

        <SettingsSection
          title='テーマ'
          description='画面の配色を選べます。「システム」はお使いの端末の設定に追従します。'
        >
          <ThemeToggle />
        </SettingsSection>

        <SettingsSection
          title='パスキー'
          badgeLabel='β版'
          withTopDivider
          description='パスキーを有効にすると、次回から生体認証やデバイスのロックだけでログインできます。'
        >
          <PasskeyToggle />
        </SettingsSection>

        <SettingsSection
          title='GitHub連携'
          withTopDivider
          description='GitHubアカウントを連携すると、次回からGitHubでログインできます。'
        >
          <GithubLinkToggle />
        </SettingsSection>
      </div>
    </div>
  )
}
