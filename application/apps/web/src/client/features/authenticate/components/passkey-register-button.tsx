import { Fingerprint } from 'lucide-react'
import { Button } from '@/client/components/shadcn/button'
import usePasskeyRegister from '@/client/features/authenticate/hooks/use-passkey-register'

export default function PasskeyRegisterButton() {
  const { isSubmitting, register } = usePasskeyRegister()

  return (
    <Button type='button' variant='outline' onClick={register} disabled={isSubmitting}>
      <Fingerprint className='mr-2 size-4' />
      {isSubmitting ? '登録中...' : 'パスキーを登録'}
    </Button>
  )
}
