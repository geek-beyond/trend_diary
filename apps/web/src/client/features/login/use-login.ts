import { useNavigate } from 'react-router'
import { useSWRConfig } from 'swr'
import { SESSION_SWR_KEY, useAuthSubmit } from '@/client/entities/session'
import getApiClientForClient from '@/client/infrastructure/api'
import { resolveLoginErrorMessage } from './error-message'

export default function useLogin(turnstileSiteKey?: string, redirectTo?: string) {
  const navigate = useNavigate()
  const { mutate } = useSWRConfig()

  return useAuthSubmit({
    turnstileSiteKey,
    request: (json) => getApiClientForClient().sessions.$post({ json }),
    resolveErrorMessage: resolveLoginErrorMessage,
    onSuccess: async () => {
      // mutate(key)は購読中のuseSWRがないと再検証されず、遷移先ページのProtectedLayoutが
      // 古い未ログイン状態を読んでログイン画面へ押し戻してしまうため、値を直接確定させる
      await mutate(SESSION_SWR_KEY, true, { revalidate: false })
      navigate(redirectTo ?? '/trends')
    },
  })
}
