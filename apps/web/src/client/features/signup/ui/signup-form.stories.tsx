import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import SignupForm from './signup-form'

const onSubmit = fn((_formData: FormData) => {})

const meta: Meta<typeof SignupForm> = {
  component: SignupForm,
  args: {
    onSubmit,
    isSubmitting: false,
  },
}
export default meta

type Story = StoryObj<typeof SignupForm>

export const EmptyForm: Story = {
  play: async ({ canvas }) => {
    // 初期状態の確認
    await expect(canvas.getByLabelText('メールアドレス')).toBeInTheDocument()
    await expect(canvas.getByLabelText('パスワード')).toBeInTheDocument()
    await expect(canvas.getByRole('button')).toBeInTheDocument()

    // フィールドが空であることを確認
    await expect(canvas.getByLabelText('メールアドレス')).toHaveValue('')
    await expect(canvas.getByLabelText('パスワード')).toHaveValue('')

    // Submitボタンのテキストが正しいことを確認
    await expect(canvas.getByRole('button')).toHaveTextContent('アカウント作成')

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
// SignupForm は表示専用コンポーネントのため、送信中状態は props で渡す。
export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
  play: async ({ canvas }) => {
    // ローディング用のボタンテキストが表示されることを確認
    await expect(canvas.getByRole('button')).toHaveTextContent('アカウント作成中...')

    // 送信中はボタンと入力欄が disabled になることを確認
    await expect(canvas.getByRole('button')).toBeDisabled()
    await expect(canvas.getByLabelText('メールアドレス')).toBeDisabled()
    await expect(canvas.getByLabelText('パスワード')).toBeDisabled()
  },
}

// Turnstileのサイトキー指定時もメール/パスワード入力が描画されることを検証する。
// ウィジェット本体は外部スクリプトに依存するため、ここでは既存フィールドの描画のみ確認する。
export const WithTurnstile: Story = {
  args: {
    turnstileSiteKey: '1x00000000000000000000AA',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('メールアドレス')).toBeInTheDocument()
    await expect(canvas.getByLabelText('パスワード')).toBeInTheDocument()
    await expect(canvas.getByRole('button')).not.toBeDisabled()
  },
}

// バリデーションエラーの表示を検証する。
// バリデーション結果（errors）は props で渡される設計のため、ここでは errors を直接与える。
export const FormValidationError: Story = {
  args: {
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
    await expect(canvas.getByRole('button')).toHaveTextContent('アカウント作成')
  },
}

// 送信時に入力値が FormData として onSubmit へ渡されることを検証する。
export const SubmitInteraction: Story = {
  play: async ({ canvas, step }) => {
    await step('入力して送信すると onSubmit が FormData 付きで呼ばれることを確認', async () => {
      await userEvent.type(canvas.getByLabelText('メールアドレス'), 'taro@example.com')
      await userEvent.type(canvas.getByLabelText('パスワード'), 'password123')
      await userEvent.click(canvas.getByRole('button', { name: 'アカウント作成' }))

      // 呼び出し回数と引数のどちらも、型付きのモック実体（args.onSubmit と同一参照）で検証して一貫させる
      await expect(onSubmit).toHaveBeenCalledTimes(1)
      const formData = onSubmit.mock.calls[0]?.[0]
      await expect(formData?.get('email')).toBe('taro@example.com')
      await expect(formData?.get('password')).toBe('password123')
    })
  },
}
