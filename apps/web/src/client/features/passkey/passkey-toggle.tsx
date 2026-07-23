import { Fingerprint } from 'lucide-react'
import { Switch } from '@/client/components/shadcn/switch'
import usePasskeyDisable from '@/client/features/passkey/use-passkey-disable'
import usePasskeyRegister from '@/client/features/passkey/use-passkey-register'
import usePasskeyStatus from '@/client/features/passkey/use-passkey-status'

export default function PasskeyToggle() {
  const { hasPasskey, isLoading, mutate } = usePasskeyStatus()
  const { isSubmitting: isRegistering, register } = usePasskeyRegister()
  const { isSubmitting: isDisabling, disable } = usePasskeyDisable()

  const isBusy = isLoading || isRegistering || isDisabling

  const handleToggle = async (checked: boolean) => {
    const succeeded = checked ? await register() : await disable()
    // 成功したら実際の登録状態を取り直し、トグルの表示をサーバーと一致させる
    if (succeeded) await mutate()
  }

  return (
    <div className='flex items-center gap-3'>
      <Fingerprint className='size-4 text-muted-foreground' />
      <Switch
        checked={hasPasskey}
        onCheckedChange={handleToggle}
        disabled={isBusy}
        aria-label='パスキーを有効にする'
      />
    </div>
  )
}
