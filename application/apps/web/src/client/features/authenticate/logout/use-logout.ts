import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import useSWRMutation from 'swr/mutation'
import { SESSION_SWR_KEY } from '@/client/entities/auth'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'

export default function useLogout() {
  const navigate = useNavigate()
  const { mutate } = useSWRConfig()
  const { client, apiCall } = createSWRFetcher()

  const { trigger, isMutating } = useSWRMutation(
    'auth/logout',
    async () => {
      return apiCall(() => client.auth.logout.$delete())
    },
    {
      onSuccess: () => {
        // ログアウト後もセッションキャッシュが古いログイン状態を保持しないよう再検証する。
        // ログアウト自体は成功しており、再検証の成否で遷移を止めたくないため投げっぱなしにする
        void mutate(SESSION_SWR_KEY)
        navigate('/login')
        toast.success('ログアウトしました')
      },
      onError: () => {
        toast.error('ログアウトに失敗しました')
      },
    },
  )

  const handleLogout = async () => {
    trigger()
  }

  return { handleLogout, isLoading: isMutating }
}
