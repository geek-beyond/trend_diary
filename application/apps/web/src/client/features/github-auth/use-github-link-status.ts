import useSWR from 'swr'
import getApiClientForClient from '@/client/infrastructure/api'

export const GITHUB_LINK_STATUS_SWR_KEY = 'api/auth/oauth/github'

// 設定画面のトグルはログイン時のみ描画されるため、ここでは無条件に連携状態を取得する
export default function useGithubLinkStatus() {
  const { data, isLoading, mutate } = useSWR(GITHUB_LINK_STATUS_SWR_KEY, async () => {
    const client = getApiClientForClient()
    const res = await client.auth.oauth.github.$get()
    if (!res.ok) return false
    const body: { linked: boolean } = await res.json()
    return body.linked
  })

  return { linked: data === true, isLoading, mutate }
}
