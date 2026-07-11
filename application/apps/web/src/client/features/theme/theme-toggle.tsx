import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ToggleGroup, type ToggleOption } from '@/client/components/ui/input/toggle-group'

const themeOptions: readonly ToggleOption<string>[] = [
  {
    value: 'system',
    label: 'システム',
    dataSlot: 'theme-system',
    icon: <Monitor className='size-4' />,
  },
  { value: 'light', label: 'ライト', dataSlot: 'theme-light', icon: <Sun className='size-4' /> },
  { value: 'dark', label: 'ダーク', dataSlot: 'theme-dark', icon: <Moon className='size-4' /> },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // サーバー描画時はテーマが未確定のため、ハイドレーション不一致を避けてマウント後に選択状態を反映する
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <ToggleGroup
      options={themeOptions}
      selectedValue={mounted ? (theme ?? 'system') : ''}
      onSelect={setTheme}
      dataSlot='theme-toggle'
      className='sm:shrink-0'
    />
  )
}
