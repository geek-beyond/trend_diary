import { AnchorLink } from '../link'

const CONTACT_FORM_URL = 'https://forms.gle/HgaE9qMXq6MJAxNG9'

export default function Footer() {
  return (
    <footer className='bg-slate-900 py-8'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col items-center gap-4 text-slate-400'>
          <nav className='flex flex-col items-center gap-3 md:flex-row md:gap-6'>
            <AnchorLink
              to='/terms-of-service'
              className='block md:py-0 hover:text-white transition-colors'
            >
              利用規約
            </AnchorLink>
            <AnchorLink
              to='/privacy-policy'
              className='block md:py-0 hover:text-white transition-colors'
            >
              プライバシーポリシー
            </AnchorLink>
            <AnchorLink
              to={CONTACT_FORM_URL}
              className='block md:py-0 hover:text-white transition-colors'
            >
              お問い合わせ
            </AnchorLink>
          </nav>
          <p className='text-sm text-center md:text-base'>
            &copy; 2025 TrendDiary. 技術トレンドを効率的に管理するツール
          </p>
        </div>
      </div>
    </footer>
  )
}
