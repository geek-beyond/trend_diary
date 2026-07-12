import { useTheme } from 'next-themes'
import { useEffect } from 'react'
import useThemePreference from './use-theme-preference'

// サーバーに保存されたテーマ(外部システム)をnext-themesへ同期する。
// 別端末で変更した設定を読み込み時に反映するための購読なのでuseEffectで扱う
export default function ThemeSync() {
  const { setTheme } = useTheme()
  const { serverTheme } = useThemePreference()

  useEffect(() => {
    if (serverTheme) setTheme(serverTheme)
  }, [serverTheme, setTheme])

  return null
}
