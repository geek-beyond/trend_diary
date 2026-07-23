import { wrapAsyncCall } from '@trend-diary/std/result'
import { useState } from 'react'
import { toast } from 'sonner'
import { PASSKEY_MESSAGES } from '@/client/features/passkey/model'
import getApiClientForClient from '@/client/infrastructure/api'

export default function usePasskeyDisable() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const disable = async () => {
    setIsSubmitting(true)
    const client = getApiClientForClient()

    const result = await wrapAsyncCall(() => client.passkey.$delete())
    setIsSubmitting(false)

    if (result.isErr() || !result.value.ok) {
      toast.error(PASSKEY_MESSAGES.disableFailed)
      return false
    }

    toast.success(PASSKEY_MESSAGES.disabled)
    return true
  }

  return { isSubmitting, disable }
}
