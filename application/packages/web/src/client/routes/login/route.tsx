import Logger from '@trend-diary/common/logger'
import {
  type ActionFunctionArgs,
  type MetaFunction,
  redirect,
  useActionData,
  useNavigation,
} from 'react-router'
import { createAuthActionUseCase } from '@/client/features/authenticate/auth-action-use-case'
import {
  AUTH_ERROR_MESSAGES,
  resolveLoginErrorMessage,
} from '@/client/features/authenticate/error-message'
import {
  type AuthenticateErrors,
  validateAuthenticateForm,
} from '../../features/authenticate/validation'
import LoginPage from './page'

type LoginActionData = {
  errors?: AuthenticateErrors
  formError?: string
}

const logger = new Logger('info', { route: 'web/client/routes/login/action' })

export const meta: MetaFunction = () => [
  { title: 'ログイン | TrendDiary' },
  {
    name: 'description',
    content:
      'TrendDiaryにログインして、技術トレンドの管理を始めましょう。Qiita、Zennの記事を効率的に管理できます。',
  },
  { property: 'og:title', content: 'ログイン | TrendDiary' },
  {
    property: 'og:description',
    content:
      'TrendDiaryにログインして、技術トレンドの管理を始めましょう。Qiita、Zennの記事を効率的に管理できます。',
  },
  { property: 'og:url', content: '/login' },
  { name: 'twitter:title', content: 'ログイン | TrendDiary' },
  {
    name: 'twitter:description',
    content:
      'TrendDiaryにログインして、技術トレンドの管理を始めましょう。Qiita、Zennの記事を効率的に管理できます。',
  },
]

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData()
  const validation = validateAuthenticateForm(formData)
  if (!validation.isValid) {
    return { errors: validation.errors } satisfies LoginActionData
  }

  try {
    const { useCase, headers } = createAuthActionUseCase(request, context)
    const result = await useCase.login(validation.data.email, validation.data.password)

    if (result.isErr()) {
      return { formError: resolveLoginErrorMessage(result.error) } satisfies LoginActionData
    }

    return redirect('/trends', { headers })
  } catch (error) {
    logger.error('Unexpected error in login action', error)
    return { formError: AUTH_ERROR_MESSAGES.unexpected } satisfies LoginActionData
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()

  return (
    <LoginPage
      isSubmitting={navigation.state === 'submitting'}
      errors={actionData?.errors}
      formError={actionData?.formError}
    />
  )
}
