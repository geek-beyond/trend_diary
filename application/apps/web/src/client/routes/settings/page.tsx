import LoginRequired from '@/client/components/ui/feedback/login-required'
// barrel経由だと authenticate feature 全体をカバレッジ計測に巻き込むため、コンポーネントを直接importする
import PasskeyRegisterButton from '@/client/features/authenticate/components/passkey-register-button'

interface Props {
  isLoggedIn: boolean
  // passkey無効の環境ではセクションを出さないため任意項目とする
  passkeyEnabled: boolean
}

export default function SettingsPage({ isLoggedIn, passkeyEnabled }: Props) {
  const pageTitle = '設定'

  if (!isLoggedIn) {
    return <LoginRequired pageTitle={pageTitle} />
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6'>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-sm'>
        <h1 className='text-xl font-semibold text-gray-900'>{pageTitle}</h1>

        {passkeyEnabled && (
          <section className='mt-6' data-slot='settings-passkey'>
            <h2 className='text-sm font-semibold text-gray-700'>パスキー</h2>
            <p className='mt-1 text-sm text-gray-600'>
              パスキーを登録すると、次回から生体認証やデバイスのロックだけでログインできます。
            </p>
            <div className='mt-3'>
              <PasskeyRegisterButton />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
