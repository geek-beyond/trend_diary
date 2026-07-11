import { SiGithub } from '@icons-pack/react-simple-icons'
import { Link } from 'react-router'
import { Button } from '@/client/components/shadcn/button'
import { buildGithubLoginUrl } from '@/client/features/github-auth/model'

interface Props {
  // 新規登録画面では「GitHubで登録」のように文言を変えられるようにする
  label?: string
  redirectTo?: string
}

export default function GithubLoginButton({ label = 'GitHubでログイン', redirectTo }: Props) {
  return (
    <Button asChild variant='outline' className='w-full'>
      {/* OAuth開始はSPA遷移ではなくサーバーエンドポイントへのトップレベル遷移が必要なため、reloadDocumentでフルページ遷移させる */}
      <Link to={buildGithubLoginUrl(redirectTo)} reloadDocument>
        {/* aria-hiddenでtitle要素をアクセシブル名から除外し、リンク名をラベルに保つ */}
        <SiGithub aria-hidden className='mr-2 size-4' />
        {label}
      </Link>
    </Button>
  )
}
