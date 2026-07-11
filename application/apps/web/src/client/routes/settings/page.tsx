import { Badge } from '@/client/components/shadcn/badge'
import { GithubLinkToggle } from '@/client/features/github-auth'
import { PasskeyToggle } from '@/client/features/passkey'
import { ThemeToggle } from '@/client/features/theme'

interface Props {
  githubLinkError?: string
}

export default function SettingsPage({ githubLinkError }: Props) {
  const pageTitle = '設定'

  return (
    <div className='min-h-screen bg-gradient-to-br from-muted to-background p-6'>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/50 p-6 shadow-xl backdrop-blur-sm'>
        <h1 className='text-xl font-semibold text-foreground'>{pageTitle}</h1>

        <section className='mt-6 flex items-start justify-between gap-4'>
          <div>
            <h2 className='text-sm font-semibold text-foreground'>テーマ</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              画面の配色を選べます。「システム」はお使いの端末の設定に追従します。
            </p>
          </div>
          <ThemeToggle />
        </section>

        <section className='mt-6 flex items-start justify-between gap-4 border-t border-border pt-6'>
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

        <section className='mt-6 flex items-start justify-between gap-4 border-t border-border pt-6'>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-sm font-semibold text-foreground'>GitHub連携</h2>
              <Badge variant='secondary'>β版</Badge>
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              GitHubアカウントを連携すると、次回からGitHubでログインできます。
            </p>
            {githubLinkError && <p className='mt-1 text-sm text-destructive'>{githubLinkError}</p>}
          </div>
          <GithubLinkToggle />
        </section>
      </div>
    </div>
  )
}
