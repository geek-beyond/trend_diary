import useSWR from 'swr'
import getApiClientForClient from '@/client/infrastructure/api'

export const SESSION_SWR_KEY = 'api/auth/me'

// 未ログインはAPIが401で表現するため、例外にせずres.okの真偽で判定する
export default function useSession() {
  const { data } = useSWR(SESSION_SWR_KEY, async () => {
    const client = getApiClientForClient()
    const res = await client.auth.me.$get()
    return res.ok
  })

  return { isLoggedIn: data === true }
}
