import { Button } from '@/client/components/shadcn/button'
import useLogout from './use-logout'

export default function LogoutButton() {
  const { handleLogout, isLoading } = useLogout()

  return (
    <Button onClick={handleLogout} disabled={isLoading} variant='outline'>
      {isLoading ? 'ログアウト中...' : 'ログアウト'}
    </Button>
  )
}
