import { SiGithub } from '@icons-pack/react-simple-icons'
import { Link } from 'react-router'
import { Button } from '@/client/components/shadcn/button'
import { buildGithubLoginUrl } from '@/client/features/github-auth/model'

interface Props {
  // 新規登録画面では「GitHubで登録」のように文言を変えられるようにする
  label?: string
  redirectTo?: string
}

export default function GithubAuthButton({ label = 'GitHubでログイン', redirectTo }: Props) {
  return (
    <Button asChild variant='outline' className='w-full'>
      {/* Cookieを確立するOAuth開始はSPA内遷移では成立しないため、reloadDocumentでドキュメントごと遷移する */}
      <Link to={buildGithubLoginUrl(redirectTo)} reloadDocument>
        <SiGithub aria-hidden className='mr-2 size-4' />
        {label}
      </Link>
    </Button>
  )
}
