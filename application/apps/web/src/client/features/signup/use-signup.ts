import { useNavigate } from 'react-router'
import { useAuthSubmit } from '@/client/entities/session'
import getApiClientForClient from '@/client/infrastructure/api'
import { resolveSignupErrorMessage } from './error-message'

export default function useSignup(turnstileSiteKey?: string) {
  const navigate = useNavigate()

  return useAuthSubmit({
    turnstileSiteKey,
    request: (json) => getApiClientForClient().registrations.$post({ json }),
    resolveErrorMessage: resolveSignupErrorMessage,
    onSuccess: () => navigate('/login'),
  })
}
