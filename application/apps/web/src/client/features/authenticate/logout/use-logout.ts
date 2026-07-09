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
      onSuccess: async () => {
        // navigateの完了(コミット)を待たずにセッションキャッシュを更新すると、/settingsを
        // 抜けきる前にProtectedLayoutがまだ古いログイン状態と現在地を見て、元のページへの
        // redirectクエリ付きで割り込む余地がある。navigateが確定しProtectedLayoutの管轄外に
        // 出てからキャッシュを更新することで、この割り込みを構造的に防ぐ
        await navigate('/login')
        void mutate(SESSION_SWR_KEY, false, { revalidate: false })
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
