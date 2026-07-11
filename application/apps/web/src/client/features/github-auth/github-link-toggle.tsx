import { Switch } from '@/client/components/shadcn/switch'
import GithubIcon from '@/client/features/github-auth/github-icon'
import { navigateToGithubLink } from '@/client/features/github-auth/model'
import useGithubLinkStatus from '@/client/features/github-auth/use-github-link-status'
import useGithubUnlink from '@/client/features/github-auth/use-github-unlink'

export default function GithubLinkToggle() {
  const { linked, isLoading, mutate } = useGithubLinkStatus()
  const { isSubmitting, unlink } = useGithubUnlink()

  const isBusy = isLoading || isSubmitting

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // 連携はGitHubの認可画面への遷移で始まるため、fetchではなくフルページ遷移で開始する
      navigateToGithubLink()
      return
    }

    const succeeded = await unlink()
    // 成功したら実際の連携状態を取り直し、トグルの表示をサーバーと一致させる
    if (succeeded) await mutate()
  }

  return (
    <div className='flex items-center gap-3'>
      <GithubIcon className='size-4 text-muted-foreground' />
      <Switch
        checked={linked}
        onCheckedChange={handleToggle}
        disabled={isBusy}
        aria-label='GitHub連携を有効にする'
      />
    </div>
  )
}
