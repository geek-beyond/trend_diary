import { Badge } from '@/client/components/shadcn/badge'
import { Button } from '@/client/components/shadcn/button'
import GithubIcon from '@/client/features/github-auth/github-icon'
import { buildGithubLoginUrl } from '@/client/features/github-auth/model'

interface Props {
  // 新規登録画面では「GitHubで登録」のように文言を変えられるようにする
  label?: string
  redirectTo?: string
}

export default function GithubLoginButton({ label = 'GitHubでログイン', redirectTo }: Props) {
  return (
    <Button asChild variant='outline' className='w-full'>
      {/* oxlint-disable-next-line react/forbid-elements -- OAuth開始はSPA遷移ではなくサーバーエンドポイントへのトップレベル遷移が必要で、生の <a> が唯一の実装手段のため許可する */}
      <a href={buildGithubLoginUrl(redirectTo)}>
        <GithubIcon className='mr-2 size-4' />
        {label}
        {/* aria-hidden で表示のみ担い、リンクのアクセシブル名はラベルに保つ */}
        <Badge variant='secondary' aria-hidden className='ml-2'>
          β版
        </Badge>
      </a>
    </Button>
  )
}
