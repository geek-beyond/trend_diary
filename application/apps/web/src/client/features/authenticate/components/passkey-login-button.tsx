import { Fingerprint } from 'lucide-react'
import { Button } from '@/client/components/shadcn/button'
import usePasskeyLogin from '@/client/features/authenticate/hooks/use-passkey-login'

// passkeyはBeta前提のため、パスワードと同列の「選べる」ログイン手段として併記する
export default function PasskeyLoginButton() {
  const { isSubmitting, formError, login } = usePasskeyLogin()

  return (
    <div className='space-y-2'>
      <Button
        type='button'
        variant='outline'
        className='w-full'
        onClick={login}
        disabled={isSubmitting}
      >
        <Fingerprint className='mr-2 size-4' />
        {isSubmitting ? 'passkeyで認証中...' : 'passkeyでログイン'}
      </Button>
      {formError && <p className='text-destructive text-sm'>{formError}</p>}
    </div>
  )
}
