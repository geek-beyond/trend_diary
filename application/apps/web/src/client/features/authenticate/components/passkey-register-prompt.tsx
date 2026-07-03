import { Fingerprint, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/client/components/shadcn/alert'
import { Button } from '@/client/components/shadcn/button'
import usePasskeyRegister from '@/client/features/authenticate/hooks/use-passkey-register'
import usePasskeyStatus from '@/client/features/authenticate/hooks/use-passkey-status'

// ログイン中でpasskey未登録のときだけ、控えめに登録を案内する。
// Beta前提のため強制せず、閉じられる案内に留める。
export default function PasskeyRegisterPrompt() {
  const { hasPasskey } = usePasskeyStatus()
  const { isSubmitting, register } = usePasskeyRegister()
  const [dismissed, setDismissed] = useState(false)

  // 未ログイン・passkey無効(hasPasskey===undefined)・登録済み(true)・閉じた後は何も出さない
  if (hasPasskey !== false || dismissed) {
    return null
  }

  return (
    <Alert className='relative mx-4 mt-4 w-auto'>
      <Fingerprint />
      <AlertTitle>passkeyを登録できます</AlertTitle>
      <AlertDescription>
        <p>次回から生体認証やデバイスのロックだけで、より安全にログインできます。</p>
        <Button type='button' size='sm' className='mt-2' onClick={register} disabled={isSubmitting}>
          {isSubmitting ? '登録中...' : 'passkeyを登録'}
        </Button>
      </AlertDescription>
      <button
        type='button'
        aria-label='案内を閉じる'
        className='text-muted-foreground hover:text-foreground absolute end-2 top-2'
        onClick={() => setDismissed(true)}
      >
        <X className='size-4' />
      </button>
    </Alert>
  )
}
