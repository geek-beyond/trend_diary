import { Fingerprint } from 'lucide-react'
import { Badge } from '@/client/components/shadcn/badge'
import { Button } from '@/client/components/shadcn/button'
import usePasskeyLogin from '@/client/features/passkey/use-passkey-login'

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
      <p className='text-muted-foreground flex items-center justify-center gap-1.5 text-xs'>
        <Badge variant='secondary'>β版</Badge>
        パスキーは試験提供中の機能です
      </p>
      {formError && <p className='text-destructive text-sm'>{formError}</p>}
    </div>
  )
}
