import { BookOpen, Calendar, Monitor, TrendingUp, Users } from 'lucide-react'
import type { MetaFunction } from 'react-router'
import { ClipText } from '../components/ui/clip-text'
import Footer from '../components/ui/footer'
import LandingHeader from '../components/ui/landing-header'
import { AnchorLink } from '../components/ui/link'

export const meta: MetaFunction = () => [
  { property: 'og:title', content: 'TrendDiary | 技術トレンドを効率的に管理' },
  {
    property: 'og:description',
    content:
      'QiitaやZennの記事を日記のように管理し、技術トレンドを見逃さない。技術者向けのトレンド管理ブラウザアプリです。',
  },
  { property: 'og:url', content: '/' },
  { name: 'twitter:title', content: 'TrendDiary | 技術トレンドを効率的に管理' },
  {
    name: 'twitter:description',
    content:
      'QiitaやZennの記事を日記のように管理し、技術トレンドを見逃さない。技術者向けのトレンド管理ブラウザアプリです。',
  },
]

const TrendDiaryTopPage = () => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-white'>
      <LandingHeader />

      {/* Hero Section */}
      <section className='relative overflow-hidden'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24'>
          <div className='text-center'>
            <div className='flex justify-center mb-8'>
              <div className='relative'>
                <div className='flex items-center space-x-2 bg-blue-50 rounded-full px-6 py-2 border border-blue-200'>
                  <Calendar className='h-5 w-5 text-blue-600' />
                  <span className='text-blue-800 font-medium'>技術トレンドを日記のように管理</span>
                </div>
              </div>
            </div>

            <h1 className='text-5xl sm:text-6xl font-bold text-slate-900 tracking-tight mb-6'>
              技術トレンドを
              <ClipText text='効率的に追跡' className='mt-2' />
            </h1>

            <p className='text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed'>
              QiitaやZennの記事を読んだかどうかを管理し、技術トレンドを見逃さない。
              日々のキャッチアップを日記のように記録できるブラウザアプリです。
            </p>

            <div className='flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center'>
              <AnchorLink
                to='/trends'
                className='inline-flex w-44 sm:w-auto items-center justify-center px-4 py-2.5 sm:px-8 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-base sm:text-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl'
              >
                今すぐ始める
              </AnchorLink>
              <AnchorLink
                to='/login'
                className='inline-flex w-44 sm:w-auto items-center justify-center px-4 py-2.5 sm:px-8 sm:py-4 border-2 border-slate-300 text-slate-700 rounded-lg text-base sm:text-lg font-semibold hover:border-slate-400 hover:bg-slate-50 transition-all duration-200'
              >
                ログイン
              </AnchorLink>
            </div>
          </div>
        </div>

        {/* Background Decoration */}
        <div className='absolute inset-0 -z-10'>
          <div className='absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse'></div>
          <div
            className='absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse'
            style={{ animationDelay: '2s' }}
          ></div>
        </div>
      </section>

      {/* Features Section */}
      <section className='py-20 bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl font-bold text-slate-900 mb-4'>なぜTrendDiaryを選ぶのか？</h2>
            <p className='text-lg text-slate-600 max-w-2xl mx-auto'>
              Slack
              RSSフィードとは違って特定のアプリに依存せず、Webブラウザからトレンド記事を確認できます。
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='text-center p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200'>
              <div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4'>
                <BookOpen className='h-6 w-6 text-blue-600' />
              </div>
              <h3 className='text-xl font-semibold text-slate-900 mb-2'>読書状況の管理</h3>
              <p className='text-slate-600'>
                記事を読んだかどうかを簡単に記録し、読み逃しを防げます。
              </p>
            </div>

            <div className='text-center p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200'>
              <div className='w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4'>
                <TrendingUp className='h-6 w-6 text-green-600' />
              </div>
              <h3 className='text-xl font-semibold text-slate-900 mb-2'>トレンド追跡</h3>
              <p className='text-slate-600'>
                QiitaやZennの最新技術トレンドを効率的にキャッチアップできます
              </p>
            </div>

            <div className='text-center p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200'>
              <div className='w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4'>
                <Users className='h-6 w-6 text-purple-600' />
              </div>
              <h3 className='text-xl font-semibold text-slate-900 mb-2'>技術者向け</h3>
              <p className='text-slate-600'>技術者のニーズに特化した、使いやすいインターフェース</p>
            </div>
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className='py-20 bg-slate-50'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl font-bold text-slate-900 mb-4'>推奨環境</h2>
            <p className='text-lg text-slate-600'>TrendDiaryを快適にご利用いただくための推奨環境</p>
          </div>

          <div className='bg-white rounded-2xl shadow-sm border border-slate-200 p-8'>
            <div className='flex justify-center'>
              <div className='text-center max-w-md'>
                <div className='w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6'>
                  <Monitor className='h-10 w-10 text-blue-600' />
                </div>
                <h3 className='text-2xl font-semibold text-slate-900 mb-4'>推奨環境</h3>
                <div className='space-y-3 text-slate-600'>
                  <div className='flex items-center space-x-3'>
                    <span className='w-2 h-2 bg-blue-500 rounded-full flex-shrink-0'></span>
                    <span className='text-lg'>Mac</span>
                  </div>
                  <div className='flex items-center space-x-3'>
                    <span className='w-2 h-2 bg-blue-500 rounded-full flex-shrink-0'></span>
                    <span className='text-lg'>Google Chrome 最新版</span>
                  </div>
                  <div className='flex items-center space-x-3'>
                    <span className='w-2 h-2 bg-blue-500 rounded-full flex-shrink-0'></span>
                    <span className='text-lg'>画面幅 1024px 以上</span>
                  </div>
                </div>
                <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
                  <p className='text-sm text-blue-800'>
                    ※記事一覧をサイドバー形式で表示するため、十分な画面幅を推奨しています
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-20 bg-gradient-to-r from-blue-600 to-purple-600'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
          <h2 className='text-3xl font-bold text-white mb-4'>
            今すぐ技術トレンドの管理を始めましょう
          </h2>
          <p className='text-xl text-blue-100 mb-8 max-w-2xl mx-auto'>
            効率的な技術トレンドのキャッチアップを体験してください
          </p>
          <AnchorLink
            to='/signup'
            className='inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 bg-white text-blue-600 rounded-lg text-base sm:text-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl'
          >
            <ClipText text='無料でアカウントを作成' />
          </AnchorLink>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default TrendDiaryTopPage
