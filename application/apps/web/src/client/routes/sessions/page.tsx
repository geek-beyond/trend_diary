import { GithubAuthButton } from '@/client/features/github-auth'
import { LoginForm, type LoginFormProps } from '@/client/features/login'
import { PasskeyLoginButton } from '@/client/features/passkey'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/shadcn/card'
import Footer from '../../components/ui/layout/footer'
import LandingHeader from '../../components/ui/layout/landing-header'
import { AnchorLink } from '../../components/ui/navigation/link'

interface Props extends LoginFormProps {
  redirectTo?: string
}

export default function LoginPage({
  onSubmit,
  isSubmitting,
  errors,
  formError,
  turnstileSiteKey,
  redirectTo,
}: Props) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-muted to-background'>
      <LandingHeader />
      <main className='flex min-h-[calc(100vh-180px)] items-center justify-center p-4'>
        <Card className='flex w-full max-w-md flex-col'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl font-bold'>ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              errors={errors}
              formError={formError}
              turnstileSiteKey={turnstileSiteKey}
            />
            <div className='mt-6 space-y-4'>
              <div className='flex items-center gap-3'>
                <span className='bg-border h-px flex-1' />
                <span className='text-muted-foreground text-xs'>または</span>
                <span className='bg-border h-px flex-1' />
              </div>
              <PasskeyLoginButton redirectTo={redirectTo} />
              <GithubAuthButton label='GitHubでログイン' redirectTo={redirectTo} />
            </div>
          </CardContent>
          <CardFooter className='flex flex-col gap-4 border-t pt-6'>
            <div className='text-muted-foreground text-center text-sm'>
              アカウントをお持ちでないですか？{' '}
              <AnchorLink
                to='/registrations'
                className='text-primary hover:text-primary/90 underline'
              >
                アカウント作成
              </AnchorLink>
            </div>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
