import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useOutletContext,
} from 'react-router'
import { resolvePasskeyEnabled } from '@/client/features/passkey'
import type { AppLayoutOutletContext } from '../app-layout'
import SettingsPage from './page'

export const meta: MetaFunction = () => [{ title: '設定 | TrendDiary' }]

export function loader({ context }: LoaderFunctionArgs) {
  return { passkeyEnabled: resolvePasskeyEnabled(context) }
}

export default function SettingsRoute() {
  const { isLoggedIn } = useOutletContext<AppLayoutOutletContext>()
  const { passkeyEnabled } = useLoaderData<typeof loader>()

  return <SettingsPage isLoggedIn={isLoggedIn} passkeyEnabled={passkeyEnabled} />
}
