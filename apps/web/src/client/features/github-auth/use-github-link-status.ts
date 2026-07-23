import useSWR from 'swr'
import getApiClientForClient from '@/client/infrastructure/api'

const GITHUB_LINK_STATUS_SWR_KEY = 'api/oauth/github'

// 設定画面のトグルはログイン時のみ描画されるため、ここでは無条件に連携状態を取得する
export default function useGithubLinkStatus() {
  const { data, isLoading, mutate } = useSWR(GITHUB_LINK_STATUS_SWR_KEY, async () => {
    const client = getApiClientForClient()
    const res = await client.oauth[':provider'].$get({ param: { provider: 'github' } })
    // RPC 型は成功レスポンスのみを表すため、ミドルウェア由来の 401 と比較できるよう widening する
    const status: number = res.status
    // セッション切れ（401）は未連携表示への縮退でよいが、5xx 等まで「未連携」に
    // 偽装するとサーバ側の障害が監視から漏れるため送出する
    if (status === 401) return false
    if (!res.ok) throw new Error(`Failed to fetch GitHub link status: ${status}`)
    const body: { linked: boolean } = await res.json()
    return body.linked
  })

  return { linked: data === true, isLoading, mutate }
}
