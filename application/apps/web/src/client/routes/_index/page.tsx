import { BookOpen, Calendar, Monitor, Smartphone, TrendingUp, Users } from 'lucide-react'
import Footer from '@/client/components/ui/layout/footer'
import LandingHeader from '@/client/components/ui/layout/landing-header'
import { AnchorLink } from '@/client/components/ui/navigation/link'
import { ClipText } from '@/client/components/ui/typography/clip-text'

interface Props {
  isLoggedIn: boolean
}

export default function TopPage({ isLoggedIn }: Props) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-muted to-background'>
      <LandingHeader isLoggedIn={isLoggedIn} />

      <main>
        {/* Hero Section */}
        <section className='relative overflow-hidden'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24'>
            <div className='text-center'>
              <div className='flex justify-center mb-8'>
                <div className='relative'>
                  <div className='flex items-center space-x-2 bg-blue-50 rounded-full px-6 py-2 border border-blue-200'>
                    <Calendar className='h-5 w-5 text-blue-600' />
                    <span className='text-blue-800 font-medium'>
                      技術トレンドを日記のように管理
                    </span>
                  </div>
                </div>
              </div>

              <h1 className='text-5xl sm:text-6xl font-bold text-foreground tracking-tight mb-6'>
                技術トレンドを
                <ClipText text='効率的に追跡' className='mt-2' />
              </h1>

              <p className='text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed'>
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
                  to={isLoggedIn ? '/trends' : '/login'}
                  className='inline-flex w-44 sm:w-auto items-center justify-center px-4 py-2.5 sm:px-8 sm:py-4 border-2 border-border text-foreground rounded-lg text-base sm:text-lg font-semibold hover:bg-muted transition-all duration-200'
                >
                  {isLoggedIn ? 'トレンド一覧へ' : 'ログイン'}
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
        <section className='py-20 bg-card'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='text-center mb-16'>
              <h2 className='text-3xl font-bold text-foreground mb-4'>
                なぜTrendDiaryを選ぶのか？
              </h2>
              <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
                Slack
                RSSフィードとは違って特定のアプリに依存せず、Webブラウザからトレンド記事を確認できます。
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
              <div className='text-center p-6 rounded-xl border border-border hover:border-blue-300 hover:shadow-lg transition-all duration-200'>
                <div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4'>
                  <BookOpen className='h-6 w-6 text-blue-600' />
                </div>
                <h3 className='text-xl font-semibold text-foreground mb-2'>読書状況の管理</h3>
                <p className='text-muted-foreground'>
                  記事を読んだかどうかを簡単に記録し、読み逃しを防げます。
                </p>
              </div>

              <div className='text-center p-6 rounded-xl border border-border hover:border-blue-300 hover:shadow-lg transition-all duration-200'>
                <div className='w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4'>
                  <TrendingUp className='h-6 w-6 text-green-600' />
                </div>
                <h3 className='text-xl font-semibold text-foreground mb-2'>トレンド追跡</h3>
                <p className='text-muted-foreground'>
                  QiitaやZennの最新技術トレンドを効率的にキャッチアップできます
                </p>
              </div>

              <div className='text-center p-6 rounded-xl border border-border hover:border-blue-300 hover:shadow-lg transition-all duration-200'>
                <div className='w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4'>
                  <Users className='h-6 w-6 text-purple-600' />
                </div>
                <h3 className='text-xl font-semibold text-foreground mb-2'>技術者向け</h3>
                <p className='text-muted-foreground'>
                  技術者のニーズに特化した、使いやすいインターフェース
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* System Requirements */}
        <section className='py-20 bg-muted'>
          <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='text-center mb-12'>
              <h2 className='text-3xl font-bold text-foreground mb-4'>対応環境</h2>
              <p className='text-lg text-muted-foreground'>
                スマートフォンとデスクトップの両方に対応しています
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='bg-card rounded-2xl shadow-sm border border-border p-8 text-center'>
                <div className='w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6'>
                  <Smartphone className='size-10 text-blue-600' />
                </div>
                <h3 className='text-2xl font-semibold text-foreground mb-4'>スマートフォン</h3>
                <p className='text-muted-foreground'>
                  移動中や隙間時間に、未読の記事を1件ずつ手軽に消化できます。
                  主要な操作はモバイル向けに最適化しています。
                </p>
              </div>

              <div className='bg-card rounded-2xl shadow-sm border border-border p-8 text-center'>
                <div className='w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6'>
                  <Monitor className='size-10 text-blue-600' />
                </div>
                <h3 className='text-2xl font-semibold text-foreground mb-4'>デスクトップ</h3>
                <p className='text-muted-foreground'>
                  記事一覧をサイドバー形式で表示するため、
                  広い画面ではより多くの情報を一度に確認できます。
                </p>
              </div>
            </div>

            <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
              <p className='text-center text-sm text-blue-800'>
                ※ 最新版の Google Chrome / Safari でのご利用を推奨しています
              </p>
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
              to={isLoggedIn ? '/trends' : '/signup'}
              className='inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 bg-white text-blue-600 rounded-lg text-base sm:text-lg font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl'
            >
              <ClipText text={isLoggedIn ? 'トレンド一覧へ' : '無料でアカウントを作成'} />
            </AnchorLink>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
