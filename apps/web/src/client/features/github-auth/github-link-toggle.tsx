import { SiGithub } from '@icons-pack/react-simple-icons'
import { Switch } from '@/client/components/shadcn/switch'
import { navigateToGithubLink } from '@/client/features/github-auth/model'
import useGithubLinkStatus from '@/client/features/github-auth/use-github-link-status'
import useGithubUnlink from '@/client/features/github-auth/use-github-unlink'

export default function GithubLinkToggle() {
  const { linked, isLoading, mutate } = useGithubLinkStatus()
  const { isSubmitting, unlink } = useGithubUnlink()

  const isBusy = isLoading || isSubmitting

  const handleToggle = async (checked: boolean) => {
    // disabled属性はフォーカスを奪いスクリーンリーダーへ状態が伝わらないため使わず、処理中はここで弾く
    if (isBusy) return

    if (checked) {
      navigateToGithubLink()
      return
    }

    const succeeded = await unlink()
    if (succeeded) await mutate()
  }

  return (
    <div className='flex items-center gap-3'>
      <SiGithub aria-hidden className='size-4 text-muted-foreground' />
      <Switch
        checked={linked}
        onCheckedChange={handleToggle}
        aria-busy={isBusy}
        aria-label='GitHub連携を有効にする'
      />
    </div>
  )
}
