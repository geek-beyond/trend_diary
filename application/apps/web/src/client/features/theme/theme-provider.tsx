import { ThemeProvider as NextThemesProvider } from 'next-themes'

interface Props {
  children: React.ReactNode
}

// class属性でテーマを切り替える（styles.css の .dark 変数定義と対応させるため）
export default function ThemeProvider({ children }: Props) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
      enableSystem={true}
      disableTransitionOnChange={true}
    >
      {children}
    </NextThemesProvider>
  )
}
