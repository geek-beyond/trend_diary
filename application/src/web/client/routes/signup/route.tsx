import Logger from '@trend-diary/common/logger'
import {
  type ActionFunctionArgs,
  type MetaFunction,
  redirect,
  useActionData,
  useNavigation,
} from 'react-router'
import { createAuthActionUseCase } from '@/web/client/features/authenticate/auth-action-use-case'
import {
  AUTH_ERROR_MESSAGES,
  resolveSignupErrorMessage,
} from '@/web/client/features/authenticate/error-message'
import {
  type AuthenticateErrors,
  validateAuthenticateForm,
} from '../../features/authenticate/validation'
import SignupPage from './page'

type SignupActionData = {
  errors?: AuthenticateErrors
  formError?: string
}

const logger = new Logger('info', { route: 'web/client/routes/signup/action' })

export const meta: MetaFunction = () => [
  { title: 'アカウント作成 | TrendDiary' },
  {
    name: 'description',
    content:
      'TrendDiaryのアカウントを作成して、技術トレンドの管理を始めましょう。無料で始められる技術者向けサービスです。',
  },
  { property: 'og:title', content: 'アカウント作成 | TrendDiary' },
  {
    property: 'og:description',
    content:
      'TrendDiaryのアカウントを作成して、技術トレンドの管理を始めましょう。無料で始められる技術者向けサービスです。',
  },
  { property: 'og:url', content: '/signup' },
  { name: 'twitter:title', content: 'アカウント作成 | TrendDiary' },
  {
    name: 'twitter:description',
    content:
      'TrendDiaryのアカウントを作成して、技術トレンドの管理を始めましょう。無料で始められる技術者向けサービスです。',
  },
]

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData()
  const validation = validateAuthenticateForm(formData)
  if (!validation.isValid) {
    return { errors: validation.errors } satisfies SignupActionData
  }

  try {
    const { useCase } = createAuthActionUseCase(request, context)
    const result = await useCase.signup(validation.data.email, validation.data.password)

    if (result.isErr()) {
      return { formError: resolveSignupErrorMessage(result.error) } satisfies SignupActionData
    }

    return redirect('/login')
  } catch (error) {
    logger.error('Unexpected error in signup action', error)
    return { formError: AUTH_ERROR_MESSAGES.unexpected } satisfies SignupActionData
  }
}

export default function Signup() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()

  return (
    <SignupPage
      isSubmitting={navigation.state === 'submitting'}
      errors={actionData?.errors}
      formError={actionData?.formError}
    />
  )
}
