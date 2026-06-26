import { Button } from '@/client/components/shadcn/button'
import useLogout from '@/client/features/authenticate/hooks/use-logout'

export default function LogoutButton() {
  const { handleLogout, isLoading } = useLogout()

  return (
    <Button onClick={handleLogout} disabled={isLoading} variant='outline'>
      {isLoading ? 'ログアウト中...' : 'ログアウト'}
    </Button>
  )
}
