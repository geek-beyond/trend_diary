import useSWR from 'swr'
import getApiClientForClient from '@/client/infrastructure/api'

const PASSKEY_STATUS_SWR_KEY = 'api/passkey'

// 設定画面のトグルはログイン時のみ描画されるため、ここでは無条件に登録状態を取得する
export default function usePasskeyStatus() {
  const { data, isLoading, mutate } = useSWR(PASSKEY_STATUS_SWR_KEY, async () => {
    const client = getApiClientForClient()
    const res = await client.passkey.$get()
    if (!res.ok) return false
    const body: { hasPasskey: boolean } = await res.json()
    return body.hasPasskey
  })

  return { hasPasskey: data === true, isLoading, mutate }
}
