import { Badge } from '@/client/components/shadcn/badge'
import LoginRequired from '@/client/components/ui/feedback/login-required'
import { PasskeyToggle } from '@/client/features/passkey'

interface Props {
  isLoggedIn: boolean
}

export default function SettingsPage({ isLoggedIn }: Props) {
  const pageTitle = '設定'

  if (!isLoggedIn) {
    return <LoginRequired pageTitle={pageTitle} />
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6'>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-sm'>
        <h1 className='text-xl font-semibold text-gray-900'>{pageTitle}</h1>

        <section className='mt-6 flex items-start justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2'>
              <Badge variant='secondary'>β版</Badge>
              <h2 className='text-sm font-semibold text-gray-700'>パスキー</h2>
            </div>
            <p className='mt-1 text-sm text-gray-600'>
              パスキーを有効にすると、次回から生体認証やデバイスのロックだけでログインできます。
            </p>
          </div>
          <PasskeyToggle />
        </section>
      </div>
    </div>
  )
}
