import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { ToggleGroup, type ToggleOption } from '@/client/components/ui/input/toggle-group'

const themeOptions: readonly ToggleOption<string>[] = [
  { value: 'system', label: 'システム', icon: <Monitor className='size-4' /> },
  { value: 'light', label: 'ライト', icon: <Sun className='size-4' /> },
  { value: 'dark', label: 'ダーク', icon: <Moon className='size-4' /> },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const hydrated = useHydrated()

  return (
    <ToggleGroup
      options={themeOptions}
      // サーバー描画時はテーマが未確定のため、ハイドレーション不一致を避けてマウント後に選択状態を反映する
      selectedValue={hydrated ? (theme ?? 'system') : ''}
      onSelect={setTheme}
      className='sm:shrink-0'
    />
  )
}

const emptySubscribe = () => () => {}
const getHydratedSnapshot = () => true
const getHydratedServerSnapshot = () => false

// クライアントでハイドレーション済みかを返す。SSR と初回レンダーでは false、マウント後に true になる。
// server/client でスナップショットを出し分けることで、マウント検知の setState（Effect 内の同期 setState）を
// 使わずにハイドレーション不一致を避けられる
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, getHydratedSnapshot, getHydratedServerSnapshot)
}
