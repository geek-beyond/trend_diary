import { Form } from 'react-router'
import { Button } from '../../components/shadcn/button'
import { Input } from '../../components/shadcn/input'
import { Label } from '../../components/shadcn/label'
import { AuthenticateErrors } from './validation'

type Props = {
  submitButtonText: string
  loadingSubmitButtonText: string
  isSubmitting: boolean
  errors?: AuthenticateErrors
  formError?: string
}

export const AuthenticateForm = ({
  submitButtonText,
  loadingSubmitButtonText,
  isSubmitting,
  errors,
  formError,
}: Props) => {
  return (
    <Form method='post' className='flex flex-1 flex-col gap-6'>
      <div className='space-y-2'>
        <Label htmlFor='email'>メールアドレス</Label>
        <Input
          id='email'
          name='email'
          type='email'
          placeholder='taro@example.com'
          aria-invalid={errors?.email ? true : undefined}
          disabled={isSubmitting}
        />
        {errors?.email && <p className='text-destructive text-sm'>{errors.email.at(0)}</p>}
      </div>
      <div className='space-y-2'>
        <Label htmlFor='password'>パスワード</Label>
        <Input
          id='password'
          name='password'
          type='password'
          aria-invalid={errors?.password ? true : undefined}
          disabled={isSubmitting}
        />
        {errors?.password && <p className='text-destructive text-sm'>{errors.password.at(0)}</p>}
      </div>
      {formError && <p className='text-destructive text-sm'>{formError}</p>}
      <Button role='button' type='submit' className='w-full' disabled={isSubmitting}>
        {isSubmitting ? loadingSubmitButtonText : submitButtonText}
      </Button>
    </Form>
  )
}
