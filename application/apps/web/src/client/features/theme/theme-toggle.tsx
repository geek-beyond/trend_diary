import { themeSchema } from '@trend-diary/domain/user'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ToggleGroup, type ToggleOption } from '@/client/components/ui/input/toggle-group'
import useThemePreference from './use-theme-preference'

const themeOptions: readonly ToggleOption<string>[] = [
  { value: 'system', label: 'システム', icon: <Monitor className='size-4' /> },
  { value: 'light', label: 'ライト', icon: <Sun className='size-4' /> },
  { value: 'dark', label: 'ダーク', icon: <Moon className='size-4' /> },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { saveTheme } = useThemePreference()
  const [mounted, setMounted] = useState(false)

  // サーバー描画時はテーマが未確定のため、ハイドレーション不一致を避けてマウント後に選択状態を反映する
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSelect = (value: string) => {
    // 端末内の表示を即時反映しつつ、端末間共有のためサーバーにも保存する
    setTheme(value)
    const parsed = themeSchema.safeParse(value)
    if (parsed.success) void saveTheme(parsed.data)
  }

  return (
    <ToggleGroup
      options={themeOptions}
      selectedValue={mounted ? (theme ?? 'system') : ''}
      onSelect={handleSelect}
      className='sm:shrink-0'
    />
  )
}
