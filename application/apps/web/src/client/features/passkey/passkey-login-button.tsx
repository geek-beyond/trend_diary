import { Fingerprint } from 'lucide-react'
import { Badge } from '@/client/components/shadcn/badge'
import { Button } from '@/client/components/shadcn/button'
import usePasskeyLogin from '@/client/features/passkey/use-passkey-login'

interface Props {
  redirectTo?: string
}

export default function PasskeyLoginButton({ redirectTo }: Props) {
  const { isSubmitting, formError, login } = usePasskeyLogin(redirectTo)

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
        {/* aria-hidden で表示のみ担い、ボタンのアクセシブル名は「パスキーでログイン」に保つ */}
        <Badge variant='secondary' aria-hidden className='ml-2'>
          β版
        </Badge>
      </Button>
      {formError && <p className='text-destructive text-sm'>{formError}</p>}
    </div>
  )
}
