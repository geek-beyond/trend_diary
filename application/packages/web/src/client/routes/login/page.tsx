import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/shadcn/card'
import Footer from '../../components/ui/footer'
import LandingHeader from '../../components/ui/landing-header'
import { AnchorLink } from '../../components/ui/link'
import { AuthenticateForm } from '../../features/authenticate/authenticate-form'
import { AuthenticateErrors } from '../../features/authenticate/validation'

type Props = {
  isSubmitting: boolean
  errors?: AuthenticateErrors
  formError?: string
}

export default function LoginPage({ isSubmitting, errors, formError }: Props) {
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
              submitButtonText='ログイン'
              loadingSubmitButtonText='ログイン中...'
              isSubmitting={isSubmitting}
              errors={errors}
              formError={formError}
            />
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
