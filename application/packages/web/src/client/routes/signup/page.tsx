import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/shadcn/card'
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

export default function SignupPage({ isSubmitting, errors, formError }: Props) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-white'>
      <LandingHeader />
      <div className='flex min-h-[calc(100vh-180px)] items-center justify-center p-4'>
        <Card className='flex w-full max-w-md flex-col'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl font-bold'>アカウント作成</CardTitle>
            <CardDescription>以下の情報を入力してアカウントを作成してください</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthenticateForm
              submitButtonText='アカウント作成'
              loadingSubmitButtonText='アカウント作成中...'
              isSubmitting={isSubmitting}
              errors={errors}
              formError={formError}
            />
          </CardContent>
          <CardFooter className='flex flex-col gap-4 border-t pt-6'>
            <div className='text-muted-foreground text-center text-sm'>
              既にアカウントをお持ちですか？{' '}
              <AnchorLink to='/login' className='text-primary hover:text-primary/90 underline'>
                ログイン
              </AnchorLink>
            </div>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
