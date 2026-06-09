import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { AuthenticateForm } from './authenticate-form'

const meta: Meta<typeof AuthenticateForm> = {
  component: AuthenticateForm,
}
export default meta

type Story = StoryObj<typeof AuthenticateForm>

const defaultArgs = {
  loadingSubmitButtonText: 'ログイン中...',
  submitButtonText: 'ログイン',
  isSubmitting: false,
}

export const EmptyForm: Story = {
  args: defaultArgs,
  play: async ({ canvas }) => {
    // 初期状態の確認
    await expect(canvas.getByLabelText('メールアドレス')).toBeInTheDocument()
    await expect(canvas.getByLabelText('パスワード')).toBeInTheDocument()
    await expect(canvas.getByRole('button')).toBeInTheDocument()

    // フィールドが空であることを確認
    await expect(canvas.getByLabelText('メールアドレス')).toHaveValue('')
    await expect(canvas.getByLabelText('パスワード')).toHaveValue('')

    // Submitボタンのテキストが正しいことを確認
    await expect(canvas.getByRole('button')).toHaveTextContent('ログイン')

    // エラーメッセージが表示されていないことを確認
    await expect(
      canvas.queryByText('有効なメールアドレスを入力してください'),
    ).not.toBeInTheDocument()
    await expect(canvas.queryByText('パスワードは8文字以上必要です')).not.toBeInTheDocument()

    // aria-invalid属性が設定されていないことを確認
    await expect(canvas.getByLabelText('メールアドレス')).not.toHaveAttribute('aria-invalid')
    await expect(canvas.getByLabelText('パスワード')).not.toHaveAttribute('aria-invalid')

    // ボタンが有効であることを確認
    await expect(canvas.getByRole('button')).not.toBeDisabled()
  },
}

// 送信中（isSubmitting）の表示を検証する。
// AuthenticateForm は表示専用コンポーネントのため、送信中状態は props で渡す。
export const Submitting: Story = {
  args: {
    ...defaultArgs,
    isSubmitting: true,
  },
  play: async ({ canvas }) => {
    // ローディング用のボタンテキストが表示されることを確認
    await expect(canvas.getByRole('button')).toHaveTextContent('ログイン中...')

    // 送信中はボタンと入力欄が disabled になることを確認
    await expect(canvas.getByRole('button')).toBeDisabled()
    await expect(canvas.getByLabelText('メールアドレス')).toBeDisabled()
    await expect(canvas.getByLabelText('パスワード')).toBeDisabled()
  },
}

// バリデーションエラーの表示を検証する。
// バリデーション結果（errors）は props で渡される設計のため、ここでは errors を直接与える。
export const FormValidationError: Story = {
  args: {
    ...defaultArgs,
    errors: {
      password: ['パスワードは8文字以上必要です'],
    },
  },
  play: async ({ canvas }) => {
    // バリデーションエラーメッセージが表示されることを確認
    await expect(canvas.getByText('パスワードは8文字以上必要です')).toBeInTheDocument()

    // エラーのあるフィールドに aria-invalid 属性が設定されることを確認
    await expect(canvas.getByLabelText('パスワード')).toHaveAttribute('aria-invalid', 'true')

    // エラーのないフィールドには aria-invalid が設定されないことを確認
    await expect(canvas.getByLabelText('メールアドレス')).not.toHaveAttribute('aria-invalid')

    // ローディング状態ではないため、通常のボタンテキストが表示されることを確認
    await expect(canvas.getByRole('button')).toHaveTextContent('ログイン')
  },
}
