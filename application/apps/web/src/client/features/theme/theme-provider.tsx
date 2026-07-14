import { ThemeProvider as NextThemesProvider } from 'next-themes'

interface Props {
  children: React.ReactNode
  // next-themes がSSRで挿入するインラインscriptをCSPで許可するためのnonce
  nonce?: string
}

// class属性でテーマを切り替える（styles.css の .dark 変数定義と対応させるため）
export default function ThemeProvider({ children, nonce }: Props) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
      enableSystem={true}
      disableTransitionOnChange={true}
      nonce={nonce}
    >
      {children}
    </NextThemesProvider>
  )
}
