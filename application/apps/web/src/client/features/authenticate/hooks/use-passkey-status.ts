import useSWR from 'swr'
import getApiClientForClient from '@/client/infrastructure/api'

export const PASSKEY_STATUS_SWR_KEY = 'api/auth/passkey'

// passkey登録の案内を出し分けるための状態。hasPasskey===falseのときだけ案内する。
// passkey無効(404)や未ログイン(401)はundefinedとなり、案内対象外になる。
export default function usePasskeyStatus() {
  const { data } = useSWR(PASSKEY_STATUS_SWR_KEY, async () => {
    const client = getApiClientForClient()
    const res = await client.auth.passkey.$get()
    if (!res.ok) return undefined
    const body = await res.json()
    return body.hasPasskey
  })

  return { hasPasskey: data }
}
