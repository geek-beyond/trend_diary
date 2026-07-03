import useSWR from 'swr'
import useSession from '@/client/features/authenticate/hooks/use-session'
import getApiClientForClient from '@/client/infrastructure/api'

export const PASSKEY_STATUS_SWR_KEY = 'api/auth/passkey'

// passkey登録の案内を出し分けるための状態。hasPasskey===falseのときだけ案内する。
// passkey無効(404)のときはundefinedとなり、案内対象外になる。
export default function usePasskeyStatus() {
  const { isLoggedIn } = useSession()

  // 未ログイン時は問い合わせない(401ノイズと無駄なリクエストを避け、ログイン状態の変化で再検証させる)
  const { data } = useSWR(isLoggedIn ? PASSKEY_STATUS_SWR_KEY : null, async () => {
    const client = getApiClientForClient()
    const res = await client.auth.passkey.$get()
    if (!res.ok) return undefined
    const body = await res.json()
    return body.hasPasskey
  })

  return { hasPasskey: data }
}
