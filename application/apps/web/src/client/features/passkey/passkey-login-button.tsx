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
        {/* aria-hidden で表示のみ担い、ボタンのアクセシブル名は「パスキーでログイン」に保つ */}
        <Badge variant='secondary' aria-hidden className='mr-2'>
          β版
        </Badge>
        <Fingerprint className='mr-2 size-4' />
        {isSubmitting ? 'パスキーで認証中...' : 'パスキーでログイン'}
      </Button>
      {formError && <p className='text-destructive text-sm'>{formError}</p>}
    </div>
  )
}
