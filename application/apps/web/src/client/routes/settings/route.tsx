import type { MetaFunction } from 'react-router'
import SettingsPage from './page'

export const meta: MetaFunction = () => [{ title: '設定 | TrendDiary' }]

export default function SettingsRoute() {
  return <SettingsPage />
}
