import type { Theme } from '@trend-diary/domain/user'
import { toast } from 'sonner'
import useSWR from 'swr'
import getApiClientForClient from '@/client/infrastructure/api'

export const THEME_PREFERENCE_SWR_KEY = 'api/auth/me/theme'

// サーバーに保存された端末間共有テーマを取得・更新する。
// 未ログインはAPIが401で表現するため、例外にせずnullに落とす
export default function useThemePreference() {
  const { data, mutate } = useSWR<Theme | null>(THEME_PREFERENCE_SWR_KEY, async () => {
    const client = getApiClientForClient()
    const res = await client.auth.me.$get()
    if (!res.ok) return null
    const body = await res.json()
    return body.user.theme
  })

  const saveTheme = async (theme: Theme) => {
    const client = getApiClientForClient()
    try {
      // 保存前に楽観的にキャッシュを更新し、失敗時はロールバックする
      await mutate(
        async () => {
          const res = await client.auth.me.theme.$put({ json: { theme } })
          if (!res.ok) throw new Error('failed to save theme')
          const body = await res.json()
          return body.theme
        },
        { optimisticData: theme, revalidate: false, rollbackOnError: true },
      )
      return true
    } catch {
      toast.error('テーマの保存に失敗しました')
      return false
    }
  }

  return { serverTheme: data ?? null, saveTheme, mutate }
}
