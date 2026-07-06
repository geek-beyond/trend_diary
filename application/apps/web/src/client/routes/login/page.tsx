import { AuthenticateForm, type AuthenticateFormBaseProps } from '@/client/features/authenticate'
import { PasskeyLoginButton } from '@/client/features/passkey'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/shadcn/card'
import Footer from '../../components/ui/layout/footer'
import LandingHeader from '../../components/ui/layout/landing-header'
import { AnchorLink } from '../../components/ui/navigation/link'

interface LoginPageProps extends AuthenticateFormBaseProps {
  // passkey無効の環境では選択肢を出さないため任意項目とする
  passkeyEnabled?: boolean
}

export default function LoginPage({
  onSubmit,
  isSubmitting,
  errors,
  formError,
  turnstileSiteKey,
  passkeyEnabled,
}: LoginPageProps) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-white'>
      <LandingHeader />
      <div className='flex min-h-[calc(100vh-180px)] items-center justify-center p-4'>
        <Card className='flex w-full max-w-md flex-col'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl font-bold'>ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <AuthenticateForm
              onSubmit={onSubmit}
              submitButtonText='ログイン'
              loadingSubmitButtonText='ログイン中...'
              isSubmitting={isSubmitting}
              errors={errors}
              formError={formError}
              turnstileSiteKey={turnstileSiteKey}
            />
            {passkeyEnabled && (
              <div className='mt-6 space-y-4'>
                <div className='flex items-center gap-3'>
                  <span className='bg-border h-px flex-1' />
                  <span className='text-muted-foreground text-xs'>または</span>
                  <span className='bg-border h-px flex-1' />
                </div>
                <PasskeyLoginButton />
              </div>
            )}
          </CardContent>
          <CardFooter className='flex flex-col gap-4 border-t pt-6'>
            <div className='text-muted-foreground text-center text-sm'>
              アカウントをお持ちでないですか？{' '}
              <AnchorLink to='/signup' className='text-primary hover:text-primary/90 underline'>
                アカウント作成
              </AnchorLink>
            </div>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
