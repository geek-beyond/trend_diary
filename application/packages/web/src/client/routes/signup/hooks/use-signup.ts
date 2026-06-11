import { useNavigate } from 'react-router'
import { resolveSignupErrorMessage } from '@/client/features/authenticate/error-message'
import useAuthSubmit from '@/client/features/authenticate/use-auth-submit'
import getApiClientForClient from '@/client/infrastructure/api'

export default function useSignup(turnstileSiteKey?: string) {
  const navigate = useNavigate()

  return useAuthSubmit({
    turnstileSiteKey,
    post: (json) => getApiClientForClient().auth.signup.$post({ json }),
    resolveErrorMessage: resolveSignupErrorMessage,
    onSuccess: () => navigate('/login'),
  })
}
