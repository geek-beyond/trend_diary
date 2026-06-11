import { useNavigate } from 'react-router'
import { useSWRConfig } from 'swr'
import { resolveLoginErrorMessage } from '@/client/features/authenticate/error-message'
import useAuthSubmit from '@/client/features/authenticate/use-auth-submit'
import { SESSION_SWR_KEY } from '@/client/features/authenticate/use-session'
import getApiClientForClient from '@/client/infrastructure/api'

export default function useLogin(turnstileSiteKey?: string) {
  const navigate = useNavigate()
  const { mutate } = useSWRConfig()

  return useAuthSubmit({
    turnstileSiteKey,
    post: (json) => getApiClientForClient().auth.login.$post({ json }),
    resolveErrorMessage: resolveLoginErrorMessage,
    onSuccess: async () => {
      // ログイン前の未ログイン状態がセッションキャッシュに残ったまま遷移しないよう再検証する
      await mutate(SESSION_SWR_KEY)
      navigate('/trends')
    },
  })
}
