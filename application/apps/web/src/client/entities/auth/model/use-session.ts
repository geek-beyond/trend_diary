import useSWR from 'swr'
import getApiClientForClient from '@/client/infrastructure/api'

export const SESSION_SWR_KEY = 'api/sessions/current'

// 未ログインはAPIが401で表現するため、例外にせずres.okの真偽で判定する
export default function useSession() {
  const { data, error } = useSWR(SESSION_SWR_KEY, async () => {
    const client = getApiClientForClient()
    const res = await client.sessions.current.$get()
    return res.ok
  })

  // data===undefined かつ通信失敗なしのときだけセッション未確定（ロード中）とする。
  // 通信失敗時はdataが未確定のままなので、無限ローディングを避けて未ログイン扱いに落とす
  return { isLoggedIn: data === true, isLoading: data === undefined && error === undefined }
}
