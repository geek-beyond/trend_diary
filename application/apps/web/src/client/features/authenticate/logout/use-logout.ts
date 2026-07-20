import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import useSWRMutation from 'swr/mutation'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'

export default function useLogout() {
  const navigate = useNavigate()
  const { client, apiCall } = createSWRFetcher()

  const { trigger, isMutating } = useSWRMutation(
    'sessions/destroy',
    async () => {
      return apiCall(() => client.sessions.$delete())
    },
    {
      onSuccess: () => {
        // navigate完了後にセッションキャッシュを楽観更新しても、Reactが/settingsの
        // ProtectedLayoutをまだコミットし切っていない一瞬が残り得る。その間にキャッシュを
        // 未ログインへ更新すると、ProtectedLayoutが古い現在地(/settings)のまま元のページへの
        // redirectクエリ付きで割り込んでしまう(navigateのPromise解決はReactのコミット完了を
        // 保証しないため)。サーバー側セッションは既にDELETEで無効化済みなので、
        // クライアントキャッシュは無理に即時更新せず次の自然な再検証に委ねる
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
