import { useNavigate } from 'react-router'
import { useSWRConfig } from 'swr'
import { SESSION_SWR_KEY, useAuthSubmit } from '@/client/entities/auth'
import getApiClientForClient from '@/client/infrastructure/api'
import { resolveLoginErrorMessage } from './error-message'

export default function useLogin(turnstileSiteKey?: string) {
  const navigate = useNavigate()
  const { mutate } = useSWRConfig()

  return useAuthSubmit({
    turnstileSiteKey,
    request: (json) => getApiClientForClient().auth.login.$post({ json }),
    resolveErrorMessage: resolveLoginErrorMessage,
    onSuccess: async () => {
      // ログイン前の未ログイン状態がセッションキャッシュに残ったまま遷移しないよう再検証する
      await mutate(SESSION_SWR_KEY)
      navigate('/trends')
    },
  })
}
