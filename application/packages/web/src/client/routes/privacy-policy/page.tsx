import Footer from '../../components/ui/footer'
import LandingHeader from '../../components/ui/landing-header'
import { Heading1, Heading2, Heading3, Paragraph } from '../../components/ui/legal'

export default function PrivacyPolicyPage() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-white'>
      <LandingHeader />
      <main className='mx-auto max-w-3xl px-4 py-12'>
        <article className='text-slate-700'>
          <Heading1>プライバシーポリシー</Heading1>
          <Paragraph>
            TrendDiary（以下「当サービス」）は、ユーザーの個人情報の保護を重要視し、個人情報保護法をはじめとする関連法令を遵守し、適切に取り扱います。
          </Paragraph>

          <Heading2>1. 事業者情報</Heading2>
          <Paragraph>
            <strong>サービス名：</strong> TrendDiary
            <br />
            <strong>運営者：</strong> TrendDiary運営チーム
            <br />
            <strong>連絡先：</strong> 当サイト内のお問い合わせフォーム
          </Paragraph>

          <Heading2>2. 収集する個人情報</Heading2>
          <Paragraph className='mb-4'>当サービスでは、以下の個人情報を収集します：</Paragraph>

          <Heading3>2.1 ユーザー登録時</Heading3>
          <ul className='mb-4 list-disc space-y-1 pl-6'>
            <li>メールアドレス</li>
            <li>パスワード（暗号化して保存）</li>
          </ul>

          <Heading3>2.2 サービス利用時</Heading3>
          <ul className='mb-4 list-disc space-y-1 pl-6'>
            <li>読んだ技術トレンド記事の記録</li>
            <li>お気に入り記事の情報</li>
            <li>サービス利用に関するメモやコメント</li>
            <li>セッション管理のための技術情報（Cookie等）</li>
          </ul>

          <Heading2>3. 個人情報の利用目的</Heading2>
          <Paragraph className='mb-4'>収集した個人情報は、以下の目的で利用します：</Paragraph>
          <ul className='mb-4 list-disc space-y-1 pl-6'>
            <li>ユーザーアカウントの作成・管理</li>
            <li>ログイン認証</li>
            <li>サービス機能の提供（技術トレンドの読了管理等）</li>
            <li>サービスの改善・向上</li>
            <li>ユーザーサポート・お問い合わせ対応</li>
            <li>重要なお知らせの配信</li>
          </ul>

          <Heading2>4. 個人情報の保管・管理</Heading2>

          <Heading3>4.1 保管場所</Heading3>
          <Paragraph className='mb-4'>
            個人情報はSupabaseのクラウドデータベースに保存され、適切なセキュリティ対策を講じて管理しています。
          </Paragraph>

          <Heading3>4.2 セキュリティ対策</Heading3>
          <ul className='mb-4 list-disc space-y-1 pl-6'>
            <li>パスワードの暗号化保存</li>
            <li>データベースへの不正アクセス防止</li>
            <li>定期的なセキュリティ更新</li>
          </ul>

          <Heading3>4.3 保管期間</Heading3>
          <ul className='mb-4 list-disc space-y-1 pl-6'>
            <li>アカウントが有効な限り保管</li>
            <li>アカウント削除後は速やかに削除</li>
          </ul>

          <Heading2>5. 個人情報の第三者提供</Heading2>
          <Paragraph className='mb-4'>
            当サービスは、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません：
          </Paragraph>
          <ul className='mb-4 list-disc space-y-1 pl-6'>
            <li>法令に基づく場合</li>
            <li>人の生命、身体または財産の保護のために必要がある場合</li>
            <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
          </ul>

          <Heading2>6. Cookieの使用</Heading2>
          <Paragraph className='mb-4'>
            当サービスでは、サービスの利便性向上のためCookieを使用しています：
          </Paragraph>
          <ul className='mb-4 list-disc space-y-1 pl-6'>
            <li>
              <strong>用途：</strong> ログイン状態の維持、セッション管理
            </li>
            <li>
              <strong>種類：</strong> セッションCookie
            </li>
            <li>
              <strong>無効化：</strong>{' '}
              ブラウザの設定で無効化可能（ただし、一部機能が制限される場合があります）
            </li>
          </ul>

          <Heading2>7. ユーザーの権利</Heading2>
          <Paragraph className='mb-4'>ユーザーは以下の権利を有します：</Paragraph>

          <Heading3>7.1 開示請求</Heading3>
          <Paragraph className='mb-4'>
            自身の個人情報の利用状況について開示を求めることができます。
          </Paragraph>

          <Heading3>7.2 訂正・削除請求</Heading3>
          <Paragraph className='mb-4'>
            個人情報に誤りがある場合、訂正・削除を求めることができます。
          </Paragraph>

          <Heading3>7.3 利用停止請求</Heading3>
          <Paragraph className='mb-4'>個人情報の利用停止を求めることができます。</Paragraph>

          <Heading3>7.4 アカウント削除</Heading3>
          <Paragraph className='mb-4'>
            アカウント削除により、登録された個人情報の削除を求めることができます。
          </Paragraph>

          <Heading2>8. お問い合わせ窓口</Heading2>
          <Paragraph className='mb-4'>
            個人情報の取り扱いに関するお問い合わせは、当サイト内のお問い合わせフォームよりご連絡ください。
          </Paragraph>

          <Heading2>9. プライバシーポリシーの変更</Heading2>
          <Paragraph>
            当プライバシーポリシーは、法令の変更やサービス内容の変更に伴い、予告なく変更することがあります。重要な変更については、サービス内でお知らせいたします。
          </Paragraph>

          <hr className='my-8 border-slate-200' />

          <p className='text-sm text-slate-600'>
            <strong>制定日：</strong> 2025年1月16日
            <br />
            <strong>最終更新日：</strong> 2025年1月16日
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}
