import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import useSWRMutation from 'swr/mutation'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'

export default function useLogout() {
  const navigate = useNavigate()
  const { client, apiCall } = createSWRFetcher()

  const { trigger, isMutating } = useSWRMutation(
    'auth/logout',
    async () => {
      return apiCall(() => client.auth.logout.$delete())
    },
    {
      onSuccess: () => {
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
