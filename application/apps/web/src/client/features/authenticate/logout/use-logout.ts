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
        // 非同期の再検証(revalidate)だとnavigate後にセッションキャッシュが古いまま残り、
        // その間にProtectedLayoutが元のページへのredirectクエリ付きで割り込む余地がある。
        // notifySessionExpiredと同様に即時反映させ、navigateを最終的な遷移として確定させる
        void mutate(SESSION_SWR_KEY, false, { revalidate: false })
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
