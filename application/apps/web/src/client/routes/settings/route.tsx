import { type MetaFunction, useOutletContext } from 'react-router'
import type { AppLayoutOutletContext } from '../app-layout'
import SettingsPage from './page'

export const meta: MetaFunction = () => [{ title: '設定 | TrendDiary' }]

export default function SettingsRoute() {
  const { isLoggedIn } = useOutletContext<AppLayoutOutletContext>()

  return <SettingsPage isLoggedIn={isLoggedIn} />
}
