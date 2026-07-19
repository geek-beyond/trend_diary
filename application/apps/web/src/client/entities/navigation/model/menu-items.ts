import { BarChart3, BookOpenCheck, Inbox, Settings, TrendingUp } from 'lucide-react'
import type { InternalPath } from '@/client/routes'

export interface MenuItem {
  title: string
  url: InternalPath
  icon: React.ElementType
}

const menuItems: MenuItem[] = [
  {
    title: 'トレンド記事',
    url: '/trends',
    icon: TrendingUp,
  },
]

const loggedInMenuItems: MenuItem[] = [
  {
    title: '未読消化',
    url: '/inbox',
    icon: Inbox,
  },
  {
    title: 'ダイアリー',
    url: '/diary',
    icon: BookOpenCheck,
  },
  {
    title: '統計',
    url: '/analytics',
    icon: BarChart3,
  },
  {
    title: '設定',
    url: '/settings',
    icon: Settings,
  },
]

export function getVisibleMenuItems(isLoggedIn: boolean): MenuItem[] {
  return isLoggedIn ? [...menuItems, ...loggedInMenuItems] : menuItems
}
