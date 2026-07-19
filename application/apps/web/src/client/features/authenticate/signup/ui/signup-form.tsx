import type { FormEvent } from 'react'
import { Button } from '@/client/components/shadcn/button'
import { Input } from '@/client/components/shadcn/input'
import { Label } from '@/client/components/shadcn/label'
import type { AuthenticateErrors } from '@/client/entities/auth/model/validation'
import { TurnstileWidget } from '@/client/entities/auth/ui/turnstile-widget'

export interface SignupFormProps {
  onSubmit: (formData: FormData) => void
  isSubmitting: boolean
  errors?: AuthenticateErrors
  formError?: string
  // 未設定の環境ではCAPTCHAを無効とするため任意項目とする
  turnstileSiteKey?: string
}

export default function SignupForm({
  onSubmit,
  isSubmitting,
  errors,
  formError,
  turnstileSiteKey,
}: SignupFormProps) {
  // DOMイベントの関心はここで閉じ、呼び出し側（hooks）はFormDataだけを扱えるようにする
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(new FormData(event.currentTarget))
  }

  const emailErrors = errors?.email
  const passwordErrors = errors?.password

  return (
    <form onSubmit={handleSubmit} className='flex flex-1 flex-col gap-6'>
      <div className='space-y-2'>
        <Label htmlFor='email'>メールアドレス</Label>
        <Input
          id='email'
          name='email'
          type='email'
          placeholder='taro@example.com'
          aria-invalid={emailErrors ? true : undefined}
          disabled={isSubmitting}
        />
        {emailErrors && <p className='text-destructive text-sm'>{emailErrors.at(0)}</p>}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='password'>パスワード</Label>
        <Input
          id='password'
          name='password'
          type='password'
          aria-invalid={passwordErrors ? true : undefined}
          disabled={isSubmitting}
        />
        {passwordErrors && <p className='text-destructive text-sm'>{passwordErrors.at(0)}</p>}
      </div>
      {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} />}
      {formError && <p className='text-destructive text-sm'>{formError}</p>}
      <Button role='button' type='submit' className='w-full' disabled={isSubmitting}>
        {isSubmitting ? 'アカウント作成中...' : 'アカウント作成'}
      </Button>
    </form>
  )
}
