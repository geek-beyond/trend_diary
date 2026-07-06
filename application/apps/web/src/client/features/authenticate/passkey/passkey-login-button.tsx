import { Fingerprint } from 'lucide-react'
import { Button } from '@/client/components/shadcn/button'
import usePasskeyLogin from '@/client/features/authenticate/passkey/use-passkey-login'

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
        {isSubmitting ? 'パスキーで認証中...' : 'パスキーでログイン'}
      </Button>
      {formError && <p className='text-destructive text-sm'>{formError}</p>}
    </div>
  )
}
